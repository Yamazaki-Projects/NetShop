-- pa0002 / pa0009 の案件レコードを削除し、幹部本人のショップは ex001 / ex002 の
-- アカウントに一本化する。
--
-- 20260726_merge_pa_into_ex_accounts.sql で pa0002→ex001、pa0009→ex002 のアカウントを
-- 統合した際、本人が運営するショップとして cases 側は ex 直下に残していた。
-- しかしこの構成では「自分のショップの紹介報酬を自分が1段目として受け取る」形になる
-- （山田裕介(ex002) が 山田裕介(pa0009) の L1 になってしまう）ため、案件ごと削除する。
--
-- 月次報酬明細は reward_rows.matched_case_id に 'ex001' / 'ex002' を入れることで
-- スタッフ本人のショップとしてマッチできる（アプリ側の buildMatchTargets に対応）。
--
-- 傘下16件は統合時にすでに ex 直下へ付け替え済みのため、この削除で紹介チェーンは切れない。
-- cases を参照する外部キーは存在しない（reward_rows.matched_case_id と
-- initial_commissions.case_id はいずれも text 型の緩い参照）。

begin;

-- 削除対象が子を持っていないことを確認する。持っていたら中断する。
do $$
declare orphan_count int;
begin
  select count(*) into orphan_count
    from cases
   where lower(referrer_id::text) in (
     select lower(id::text) from users where lower(login_id) in ('pa0002','pa0009')
   );
  if orphan_count > 0 then
    raise exception '子案件が % 件残っています。先に付け替えてください。', orphan_count;
  end if;
end $$;

-- 1. 幹部の紹介者を admin(ECP) にする。
--    admin は ECPアカウント判定に入るため、幹部本人のショップ報酬は全額ECPに繰り入る。
update users
   set referrer_id = (select id from users where lower(login_id) = 'admin')
 where lower(login_id) in ('ex001', 'ex002');

-- 2. 既存バッチの明細のマッチ先を、削除する案件からスタッフ本人へ付け替える。
--    付け替え先も紹介者がECPなので、確定済みの分配金額は変わらない。
update reward_rows set matched_case_id = 'ex001' where lower(matched_case_id) = 'pa0002';
update reward_rows set matched_case_id = 'ex002' where lower(matched_case_id) = 'pa0009';

-- 3. 紐づく初期報酬レコードを削除する（案件が消えると参照先を失うため）
delete from initial_commissions
 where lower(case_id) in ('pa0002', 'pa0009');

-- 4. 案件本体を削除する
delete from cases
 where lower(id) in ('pa0002', 'pa0009');

commit;
