-- 顧客番号(pa0001…)を使い回さないようにする。
--
-- これまでは画面側で「今ある最大の番号＋1」を計算していたため、統合や削除で
-- 最大番号の顧客が消えると、次の登録で同じ番号がまた使われた
-- （2026-10-30 石島さんの pa0120 を ex006 に統合した直後、別の顧客が pa0120 になった）。
-- 番号が使い回されると、統合ログや報酬の履歴に残った番号が別人を指してしまう。
--
-- DBのシーケンスから払い出すので、一度出した番号は二度と出ない。
-- 同時に2人が登録しても番号がぶつからない。
--
-- 開始値は、今ある顧客に加えて、ログや報酬に残っている番号も含めた最大値の次。

create sequence if not exists pa_number_seq;

do $$
declare n bigint;
begin
  select coalesce(max(num), 0) into n from (
    select case when lower(id) ~ '^pa[0-9]+$' then substr(id, 3)::bigint end as num from cases
    union all select case when lower(login_id) ~ '^pa[0-9]+$' then substr(login_id, 3)::bigint end from users
    union all select case when lower(case_id) ~ '^pa[0-9]+$' then substr(case_id, 3)::bigint end from initial_commissions
    union all select case when lower(matched_case_id) ~ '^pa[0-9]+$' then substr(matched_case_id, 3)::bigint end from reward_rows
    union all select case when lower(customer_login) ~ '^pa[0-9]+$' then substr(customer_login, 3)::bigint end from merge_logs
    union all select case when lower(target_login) ~ '^pa[0-9]+$' then substr(target_login, 3)::bigint end from referrer_change_logs
  ) x;
  -- すでに先へ進んでいる場合は戻さない
  if n >= coalesce((select last_value from pa_number_seq where is_called), 0) then
    perform setval('pa_number_seq', greatest(n, 1), n > 0);
  end if;
end $$;

create or replace function public.next_pa_id()
returns text
language sql
security definer
set search_path = public, pg_temp
as $$
  select 'pa' || lpad(nextval('pa_number_seq')::text, 4, '0');
$$;

revoke all on function public.next_pa_id() from public, anon;
grant execute on function public.next_pa_id() to authenticated;

-- シーケンスを直接進められないようにする（払い出しは next_pa_id() 経由だけ）
revoke all on sequence pa_number_seq from public, anon, authenticated;
