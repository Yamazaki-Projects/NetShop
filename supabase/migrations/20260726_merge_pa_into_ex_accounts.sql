-- pa0002 → ex001（掛奈央子）、pa0009 → ex002（山田裕介）のアカウント統合。
-- 同一人物が「代理店(pa)」と「幹部スタッフ(ex)」の2アカウントを持っていたため、
-- 紹介関係・報酬の受取先を ex 側に寄せ、重複していた pa 側のユーザーアカウントを削除する。
--
-- cases の pa0002 / pa0009 レコードは本人が運営するショップそのもの（月次報酬明細の
-- マッチング対象）なので削除せず、ex の直下にぶら下げる形で残す。
--
-- 注意: cases.referrer_id / cases.agency_id / users.referrer_id は uuid 型、
--       reward_payouts.recipient_user_id / initial_commissions.recipient_user_id は text 型。

begin;

-- 対象アカウント（実行前に users テーブルの実値と一致することを確認済み）
--   ex001  5a2efa6b-600d-4ebc-a0a8-adcbc6922115  掛奈央子   (executive)
--   pa0002 b4a8492c-969a-4c36-8f73-c5613b998508  株式会社サンステラ
--   ex002  922618f6-452f-48af-94ba-3b42e8ff94b0  山田裕介   (executive)
--   pa0009 d262d566-2958-4998-aad9-065d2eccb18a  山田 裕介 / Core Home

create temporary table merge_map (old_id uuid, new_id uuid) on commit drop;
insert into merge_map values
  ('b4a8492c-969a-4c36-8f73-c5613b998508', '5a2efa6b-600d-4ebc-a0a8-adcbc6922115'),
  ('d262d566-2958-4998-aad9-065d2eccb18a', '922618f6-452f-48af-94ba-3b42e8ff94b0');

-- 1. 傘下の案件・ユーザーの紹介者を ex に付け替える（agency_id も同じ持ち主を指すため揃える）
update cases c
   set referrer_id = m.new_id,
       agency_id   = case when c.agency_id = m.old_id then m.new_id else c.agency_id end
  from merge_map m
 where c.referrer_id = m.old_id;

update users u
   set referrer_id = m.new_id
  from merge_map m
 where u.referrer_id = m.old_id;

-- 2. 本人のショップ案件(pa0002/pa0009)自体も ex 直下に置く
update cases
   set referrer_id = '5a2efa6b-600d-4ebc-a0a8-adcbc6922115',
       agency_id   = '5a2efa6b-600d-4ebc-a0a8-adcbc6922115'
 where lower(id) = 'pa0002';

update cases
   set referrer_id = '922618f6-452f-48af-94ba-3b42e8ff94b0',
       agency_id   = '922618f6-452f-48af-94ba-3b42e8ff94b0'
 where lower(id) = 'pa0009';

-- 3. 過去の報酬レコードの受取先を ex に寄せる
update initial_commissions ic
   set recipient_user_id = m.new_id::text
  from merge_map m
 where lower(ic.recipient_user_id) = m.old_id::text;

update reward_payouts rp
   set recipient_user_id = m.new_id::text,
       recipient_name    = u.name
  from merge_map m
  join users u on u.id = m.new_id
 where lower(rp.recipient_user_id) = m.old_id::text;

-- 4. 重複していた pa 側のユーザーアカウントを削除する。
--    どちらも auth_uid が null（ログイン未設定）なので auth.users 側の後始末は不要。
delete from users
 where lower(login_id) in ('pa0002', 'pa0009');

commit;
