-- ティアツリー(リスト表示)で兄弟ノードを手動で並べ替えられるようにするための列。
-- Supabaseダッシュボードの SQL Editor でこのファイルの内容を実行してください。

alter table cases add column if not exists sort_order bigint;

-- 既存行は作成日時をそのまま初期の並び順として使う（昇順=作成が古い順）。
update cases
set sort_order = (extract(epoch from created_at) * 1000)::bigint
where sort_order is null;

create index if not exists cases_referrer_sort_idx on cases(referrer_id, sort_order);
