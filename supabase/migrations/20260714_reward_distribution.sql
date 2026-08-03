-- 月次報酬分配機能用のテーブル
-- Supabaseダッシュボードの SQL Editor でこのファイルの内容を実行してください。

create table if not exists reward_batches (
  id uuid primary key default gen_random_uuid(),
  month text not null, -- 'YYYY-MM'
  created_at timestamptz not null default now()
);

create table if not exists reward_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references reward_batches(id) on delete cascade,
  owner_name text not null,
  mall_type text not null,
  shop_url text,
  sales_amount numeric,
  reward_amount numeric not null,
  matched_case_id text,
  created_at timestamptz not null default now()
);

create table if not exists reward_payouts (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references reward_batches(id) on delete cascade,
  row_id uuid not null references reward_rows(id) on delete cascade,
  recipient_type text not null check (recipient_type in ('l1', 'l2', 'ecp')),
  recipient_user_id text,
  recipient_name text not null,
  amount numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists reward_rows_batch_id_idx on reward_rows(batch_id);
create index if not exists reward_payouts_batch_id_idx on reward_payouts(batch_id);
create index if not exists reward_payouts_recipient_user_id_idx on reward_payouts(recipient_user_id);

alter table reward_batches enable row level security;
alter table reward_rows enable row level security;
alter table reward_payouts enable row level security;

-- 既存の users/cases テーブルと同様の方針（管理者のみ運用する画面のため、
-- authenticatedロールに対して許可。既存テーブルのRLSポリシーと揃えたい場合は
-- ここを調整してください）。
create policy "reward_batches_all_authenticated" on reward_batches
  for all to authenticated using (true) with check (true);

create policy "reward_rows_all_authenticated" on reward_rows
  for all to authenticated using (true) with check (true);

create policy "reward_payouts_all_authenticated" on reward_payouts
  for all to authenticated using (true) with check (true);
