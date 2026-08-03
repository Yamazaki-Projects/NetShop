-- users / cases / initial_commissions の匿名読み取りを塞ぐ。
--
-- 問題:
--   この3テーブルは RLS が「無効」だったため、定義されていたポリシーが
--   すべて無視され、公開バンドルに含まれる anon キーだけで全件読めていた。
--   氏名・メール・電話・報酬額に加え、users.registration_code まで露出しており、
--   未使用の登録コードを読めば任意のアカウント(幹部を含む)を乗っ取れる状態だった。
--   reward_batches / reward_rows / reward_payouts は RLS 有効だったため無事。
--
-- 既存ポリシーを作り直す理由:
--   既存の users_select / cases_select_own_or_admin などは
--   「users.id = auth.uid()」「cases.agency_id = auth.uid()」で own 判定していたが、
--   users.id はアプリ内部のUUIDで、auth.uid() が指すのは users.auth_uid であり別物。
--   実データでも一致は 0/6 件で、そのまま有効化すると admin 以外は
--   自分の行すら読めなくなる。RLSが無効だったため表面化していなかった。
--
-- 方針:
--   ティアツリー・報酬分配・名前マッチングは組織全体のグラフを必要とするため、
--   authenticated には全件アクセスを許可する(reward_* と同じ方針に揃える)。
--   anon からのアクセスのみを遮断する。
--
-- 適用順: 20260803a → アプリのデプロイ → このファイル

begin;

-- 1. 実態と合っていない既存ポリシーを削除する
do $$
declare pol record;
begin
  for pol in
    select tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and tablename in ('users', 'cases', 'initial_commissions')
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- 2. authenticated 限定のポリシーを張る
create policy "users_authenticated_all" on public.users
  for all to authenticated using (true) with check (true);

create policy "cases_authenticated_all" on public.cases
  for all to authenticated using (true) with check (true);

create policy "initial_commissions_authenticated_all" on public.initial_commissions
  for all to authenticated using (true) with check (true);

-- 3. RLS を有効化する（ここで初めてポリシーが効く）
alter table public.users               enable row level security;
alter table public.cases               enable row level security;
alter table public.initial_commissions enable row level security;

commit;

-- 巻き戻す場合:
--   alter table public.users               disable row level security;
--   alter table public.cases               disable row level security;
--   alter table public.initial_commissions disable row level security;
