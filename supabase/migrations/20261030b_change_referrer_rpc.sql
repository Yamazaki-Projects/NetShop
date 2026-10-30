-- 紹介ツリーで付ける場所を間違えたときに、紹介者を付け替える関数。
--
-- 対象は顧客(pa)でも、顧客を統合した幹部(ex)でもよい。傘下は対象にぶら下がったまま一緒に移る。
-- 呼べるのは管理者(admin)だけ（2026-10-30 山崎さん指示）。
--
-- 過去の報酬は変えない（2026-10-30 山崎さん指示）。確定済みの月の reward_payouts と
-- 登録時の initial_commissions は当時の紹介者のまま残し、変更後に取り込む月から
-- 新しい紹介者で計算される。払ったお金と記録がズレないようにするため。
--
-- 型メモ: cases.referrer_id / cases.agency_id / users.referrer_id は uuid。

create table if not exists referrer_change_logs (
  id uuid primary key default gen_random_uuid(),
  executed_by uuid,
  target_login text not null,
  old_user_referrer_id uuid,
  old_case_referrer_id uuid,
  new_referrer_id uuid,
  created_at timestamptz not null default now()
);
alter table referrer_change_logs enable row level security;
-- 書き込みは下の関数(security definer)からだけ。読めるのも管理者だけ（統合ログも同じ扱いに揃える）
drop policy if exists referrer_change_logs_select on referrer_change_logs;
create policy referrer_change_logs_select on referrer_change_logs for select to authenticated
  using (exists (select 1 from users where auth_uid = auth.uid() and role = 'admin'));
drop policy if exists merge_logs_select on merge_logs;
create policy merge_logs_select on merge_logs for select to authenticated
  using (exists (select 1 from users where auth_uid = auth.uid() and role = 'admin'));

create or replace function public.change_referrer(
  p_target_login text,
  p_new_referrer_login text
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid;
  caller_role text;
  target_login text := lower(trim(p_target_login));
  t record;
  t_case record;
  r record;
  cur uuid;
  steps int := 0;
begin
  select id, role into caller_id, caller_role from users where auth_uid = auth.uid() limit 1;
  if caller_role is distinct from 'admin' then
    return json_build_object('ok', false, 'reason', 'forbidden');
  end if;

  -- 紹介ツリーの付け替えを1件ずつに並べる。同時に「AをBの下へ」「BをAの下へ」が走ると、
  -- どちらの輪の検査も通って A↔B の輪ができてしまうため
  perform pg_advisory_xact_lock(hashtext('users_referrer_tree'));

  select * into t from users where lower(login_id) = target_login for update;
  select * into t_case from cases where lower(id) = target_login for update;
  if t.id is null and t_case.id is null then
    return json_build_object('ok', false, 'reason', 'target_not_found');
  end if;
  if t.id is not null and t.role = 'admin' then
    return json_build_object('ok', false, 'reason', 'target_is_admin');
  end if;

  select * into r from users where lower(login_id) = lower(trim(p_new_referrer_login));
  if r.id is null then
    return json_build_object('ok', false, 'reason', 'referrer_not_found');
  end if;
  if t.id is not null and r.id = t.id then
    return json_build_object('ok', false, 'reason', 'self');
  end if;

  -- 新しい紹介者を辿って対象自身に戻ってくる（自分の傘下の人を紹介者にする）と輪になる
  if t.id is not null then
    cur := r.id;
    while cur is not null and steps < 100 loop
      if cur = t.id then
        return json_build_object('ok', false, 'reason', 'cycle');
      end if;
      select referrer_id into cur from users where id = cur;
      steps := steps + 1;
    end loop;
  end if;

  if t.id is not null then
    update users set referrer_id = r.id where id = t.id;
  end if;
  if t_case.id is not null then
    -- agency_id / agency_name は登録時に紹介者と同じ値で入るので、紹介者だったものだけ揃える
    update cases
       set referrer_id = r.id,
           agency_id   = case when agency_id is not distinct from t_case.referrer_id then r.id else agency_id end,
           agency_name = case when agency_id is not distinct from t_case.referrer_id then r.name else agency_name end,
           updated_at  = now()
     where id = t_case.id;
  end if;

  insert into referrer_change_logs (executed_by, target_login, old_user_referrer_id, old_case_referrer_id, new_referrer_id)
  values (caller_id, target_login, t.referrer_id, t_case.referrer_id, r.id);

  return json_build_object('ok', true, 'newReferrerName', r.name);
end $$;

revoke all on function public.change_referrer(text, text) from public, anon;
grant execute on function public.change_referrer(text, text) to authenticated;
