-- 取り込み済みバッチに残っていた「自己紹介」報酬の修正。
--
-- 2026-07 バッチで、山田裕介(ex002) が自分のショップ(旧 pa0009 / Core Home)の
-- 1段目として ¥5,000 を受け取る payout が記録されていた。
-- 20260803_drop_pa_own_shop_cases.sql で構造上は再発しなくなったが、payout は
-- 取り込み時の計算結果を保持するため自動では直らない。
--
-- 自己紹介分は「紹介者不在」と同じ扱い（ECPが吸収）に寄せる。
-- 行ごとの合計額は変わらないため、バッチ全体の R 合計とも整合したままになる。

begin;

-- 明細のオーナー本人が受取人になっている payout を抽出する
create temporary table self_payouts on commit drop as
select p.id as payout_id, p.row_id, p.amount
  from reward_payouts p
  join reward_rows r on r.id = p.row_id
  join users u on u.id::text = lower(p.recipient_user_id)
 where lower(r.matched_case_id) = lower(u.login_id);

-- 想定件数(1件)から外れていたら中断する
do $$
declare n int;
begin
  select count(*) into n from self_payouts;
  if n <> 1 then
    raise exception '自己紹介payoutが想定と異なります（% 件）。内容を確認してください。', n;
  end if;
end $$;

-- 1. 同じ明細行のECP取り分に繰り入れる
update reward_payouts e
   set amount = e.amount + s.amount
  from self_payouts s
 where e.row_id = s.row_id
   and e.recipient_type = 'ecp';

-- 2. 自己紹介のpayoutを削除する
delete from reward_payouts
 where id in (select payout_id from self_payouts);

commit;
