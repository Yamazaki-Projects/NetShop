-- 登録前の資格チェックを、users テーブルの直読みから SECURITY DEFINER 関数に移す。
--
-- 新規登録画面は未ログイン状態で動くため、これまで anon が users を直接
-- select していた。その結果 registration_code を含む全ユーザー情報が匿名で
-- 読める状態になっていた（20260803b で RLS を有効化して塞ぐ）。
--
-- この関数は判定結果(ok / reason)しか返さないため、行の中身は一切漏れない。
-- 判定条件は移行前のクライアント実装と同一。
--
-- 適用順: このファイル → アプリのデプロイ → 20260803b_enable_rls_authenticated_only.sql
-- 追加のみの変更なので、既存の動作には影響しない。

create or replace function public.check_registration_eligibility(p_login_id text, p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare u record;
begin
  select status, agency_application_status, registration_code, registration_code_used_at
    into u
    from users
   where lower(login_id) = lower(trim(p_login_id))
   limit 1;

  if not found then
    return json_build_object('ok', false, 'reason', 'not_found');
  end if;
  if u.status = 'agency' then
    return json_build_object('ok', false, 'reason', 'already_registered');
  end if;
  if u.agency_application_status is distinct from 'approved' then
    return json_build_object('ok', false, 'reason', 'not_approved');
  end if;
  if u.registration_code is distinct from trim(p_code) then
    return json_build_object('ok', false, 'reason', 'invalid_code');
  end if;
  if u.registration_code_used_at is not null then
    return json_build_object('ok', false, 'reason', 'code_used');
  end if;

  return json_build_object('ok', true);
end $$;

revoke all on function public.check_registration_eligibility(text, text) from public;
grant execute on function public.check_registration_eligibility(text, text) to anon, authenticated;
