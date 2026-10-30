-- 顧客アカウント(pa)と幹部・共同経営者アカウント(ex)が同一人物だったときに、
-- 画面のボタン1つで ex 側へ統合する関数。
--
-- これまで 20260726 / 20260803 / 20260923 で毎回手書きしていた統合SQLを一般化したもの。
-- やることは同じ:
--   1. pa 傘下の案件・ユーザーの紹介者を ex に付け替える
--   2. 過去の報酬(初期報酬・月次分配)の受取先を ex に寄せる
--   3. pa 本人のショップを指していた明細・初期報酬を ex に読み替える
--   4. 重複していた pa の案件とユーザーを削除する
--
-- 前例との違い: ex の紹介者は admin(ECP) 固定にせず、pa が紹介ツリー上で持っていた
-- 紹介者をそのまま引き継ぐ（ツリー上の位置を維持する。2026-10-30 山崎さん指示）。
-- 本人のショップの報酬は、引き継いだ紹介者が1段目として受け取る。
--
-- p_execute = false のときは何も変更せず、移す件数と引き継ぐ紹介者だけを返す（確認画面用）。
-- 途中で失敗した場合は関数全体がロールバックされ、中途半端な統合は残らない。
--
-- 呼べるのは管理者・共同経営者だけ。幹部に許すと、自分を統合先に指定して他人の傘下や
-- 過去の報酬を自分に付け替えられてしまうため。実行した統合は merge_logs に残す。
--
-- 型メモ: cases.referrer_id / cases.agency_id / users.referrer_id は uuid、
--         reward_payouts.recipient_user_id / initial_commissions.recipient_user_id は text。

create table if not exists merge_logs (
  id uuid primary key default gen_random_uuid(),
  executed_by uuid,
  customer_login text not null,
  staff_login text not null,
  new_referrer_id uuid,
  detail json,
  created_at timestamptz not null default now()
);
alter table merge_logs enable row level security;
-- 書き込みは下の関数(security definer)からだけ。画面からは読み取りのみ
drop policy if exists merge_logs_select on merge_logs;
create policy merge_logs_select on merge_logs for select to authenticated using (true);

create or replace function public.merge_customer_into_staff(
  p_customer_login text,
  p_staff_login text,
  p_execute boolean default false
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_role text;
  caller_id uuid;
  result json;
  pa record;
  pa_case record;
  ex record;
  pa_id uuid;
  pa_login text := lower(trim(p_customer_login));
  ex_login text := lower(trim(p_staff_login));
  new_ref uuid;
  new_ref_name text;
  cur uuid;
  steps int := 0;
  n_child_cases int;
  n_child_users int;
  n_commissions int;
  n_payouts int;
  n_rows int;
begin
  -- 呼び出し元は管理者・共同経営者に限る
  select id, role into caller_id, caller_role from users where auth_uid = auth.uid() limit 1;
  if caller_role is null or caller_role not in ('admin', 'co_owner') then
    return json_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select * into ex from users where lower(login_id) = ex_login for update;
  if not found then
    return json_build_object('ok', false, 'reason', 'staff_not_found');
  end if;
  if ex.role not in ('executive', 'co_owner') then
    return json_build_object('ok', false, 'reason', 'not_staff');
  end if;

  select * into pa from users where lower(login_id) = pa_login for update;
  select * into pa_case from cases where lower(id) = pa_login for update;
  if pa.id is null and pa_case.id is null then
    return json_build_object('ok', false, 'reason', 'customer_not_found');
  end if;
  if pa.id is not null and pa.role <> 'agency' then
    return json_build_object('ok', false, 'reason', 'customer_is_staff');
  end if;
  -- pa でログインできる状態だと、削除するとログインアカウントだけが宙に浮く
  if pa.auth_uid is not null then
    return json_build_object('ok', false, 'reason', 'customer_has_login');
  end if;
  pa_id := pa.id;

  -- 引き継ぐ紹介者。pa 側に無い・pa の紹介者が ex 本人のときは ex の今の紹介者のまま
  new_ref := coalesce(pa.referrer_id, pa_case.referrer_id);
  if new_ref is null or new_ref = ex.id then
    new_ref := ex.referrer_id;
  end if;

  -- 紹介者を辿って ex 自身に戻ってくる（ex の傘下の人を紹介者にする）と輪になる
  cur := new_ref;
  while cur is not null and steps < 100 loop
    if cur = ex.id then
      return json_build_object('ok', false, 'reason', 'cycle');
    end if;
    select referrer_id into cur from users where id = cur;
    steps := steps + 1;
  end loop;

  select name into new_ref_name from users where id = new_ref;

  select count(*) into n_child_cases from cases
   where pa_id is not null and referrer_id = pa_id and lower(id) <> pa_login;
  select count(*) into n_child_users from users
   where pa_id is not null and referrer_id = pa_id;
  select count(*) into n_commissions from initial_commissions
   where (pa_id is not null and lower(recipient_user_id) = pa_id::text) or lower(case_id) = pa_login;
  select count(*) into n_payouts from reward_payouts
   where pa_id is not null and lower(recipient_user_id) = pa_id::text;
  select count(*) into n_rows from reward_rows where lower(matched_case_id) = pa_login;

  if not p_execute then
    return json_build_object(
      'ok', true,
      'executed', false,
      'staffName', ex.name,
      'newReferrerName', coalesce(new_ref_name, 'ECP'),
      'childCases', n_child_cases,
      'childUsers', n_child_users,
      'commissions', n_commissions,
      'payouts', n_payouts,
      'rewardRows', n_rows
    );
  end if;

  if pa_id is not null then
    -- 1. 傘下の付け替え（agency_id も同じ持ち主を指すため揃える）
    update cases
       set referrer_id = ex.id,
           agency_id   = case when agency_id = pa_id then ex.id else agency_id end
     where referrer_id = pa_id and lower(id) <> pa_login;
    update users set referrer_id = ex.id where referrer_id = pa_id;

    -- 2. 過去の報酬の受取先を ex に寄せる
    update initial_commissions set recipient_user_id = ex.id::text
     where lower(recipient_user_id) = pa_id::text;
    update reward_payouts set recipient_user_id = ex.id::text, recipient_name = ex.name
     where lower(recipient_user_id) = pa_id::text;
  end if;

  -- 3. 本人のショップを指していた明細・初期報酬を ex に読み替える
  update reward_rows set matched_case_id = ex.login_id where lower(matched_case_id) = pa_login;
  update initial_commissions set case_id = ex.login_id where lower(case_id) = pa_login;

  -- 紹介ツリー上の位置を引き継ぐ
  update users set referrer_id = new_ref where id = ex.id;

  -- 4. 重複していた pa を削除する
  delete from cases where lower(id) = pa_login;
  if pa_id is not null then
    delete from users where id = pa_id;
  end if;

  result := json_build_object(
    'ok', true,
    'executed', true,
    'staffName', ex.name,
    'newReferrerName', coalesce(new_ref_name, 'ECP'),
    'childCases', n_child_cases,
    'childUsers', n_child_users,
    'commissions', n_commissions,
    'payouts', n_payouts,
    'rewardRows', n_rows
  );
  insert into merge_logs (executed_by, customer_login, staff_login, new_referrer_id, detail)
  values (caller_id, pa_login, ex.login_id, new_ref, result);
  return result;
end $$;

revoke all on function public.merge_customer_into_staff(text, text, boolean) from public, anon;
grant execute on function public.merge_customer_into_staff(text, text, boolean) to authenticated;
