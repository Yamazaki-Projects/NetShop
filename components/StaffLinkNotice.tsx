import React from 'react';
import { db } from '../services/dbService';
import { User, UserRole } from '../types';
import { Button } from './UI';

const REASON_MESSAGES: Record<string, string> = {
  forbidden: '統合できるのは管理者・共同経営者のみです。',
  staff_not_found: '幹部アカウントが見つかりません。',
  not_staff: '統合先が幹部・共同経営者ではありません。',
  customer_not_found: '顧客が見つかりません。すでに統合済みの可能性があります。',
  customer_is_staff: 'この顧客はスタッフアカウントのため統合できません。',
  customer_has_login: 'この顧客はすでにログインできる状態のため、ボタンでは統合できません。山崎さんに相談してください。',
  cycle: '統合すると紹介ツリーが輪になってしまうため統合できません（幹部の傘下の人が紹介者になっています）。'
};

const reasonMessage = (reason?: string) => REASON_MESSAGES[reason || ''] || `統合に失敗しました（${reason || '不明なエラー'}）。`;

/**
 * 顧客(pa)を幹部アカウントへ統合する。件数を確認してもらってから実行する。
 * 統合した場合は true を返す。
 */
export const mergeCustomerIntoStaffWithConfirm = async (customerId: string, staff: User): Promise<boolean> => {
  const preview = await db.mergeCustomerIntoStaff(customerId, staff.loginId, false);
  if (!preview.ok) {
    alert(reasonMessage(preview.reason));
    return false;
  }
  const moves = [
    preview.childCases ? `傘下の顧客 ${preview.childCases}件` : '',
    preview.commissions ? `初期報酬 ${preview.commissions}件` : '',
    preview.payouts ? `月次報酬の受取 ${preview.payouts}件` : '',
    preview.rewardRows ? `本人のショップの月次明細 ${preview.rewardRows}件` : ''
  ].filter(Boolean);
  const message = [
    `${(customerId || '').toLowerCase()} を幹部の${preview.staffName}さん（${(staff.loginId || '').toLowerCase()}）に統合します。`,
    '',
    `紹介者：${preview.newReferrerName}（紹介ツリーの位置はそのまま）`,
    moves.length > 0 ? `幹部アカウントに移すもの：${moves.join('・')}` : '移す紹介先・報酬はありません。',
    '',
    `統合後、${(customerId || '').toLowerCase()} の顧客データは削除されます。元に戻せません。よろしいですか？`
  ].join('\n');
  if (!window.confirm(message)) return false;

  const result = await db.mergeCustomerIntoStaff(customerId, staff.loginId, true);
  if (!result.ok) {
    alert(reasonMessage(result.reason));
    return false;
  }
  return true;
};

/** 統合ボタンを出してよい人（関数側も管理者・共同経営者に限っている）。 */
export const canMergeIntoStaff = (user?: User | null) =>
  user?.role === UserRole.ADMIN || user?.role === UserRole.CO_OWNER;

/**
 * 新規登録で「幹部の◯◯さんとして登録」を選んだとき。
 * いったん通常どおり登録してから、すぐ幹部アカウントに統合する（紹介者は登録時に選んだ人）。
 * 統合に失敗した場合は顧客が残るので、顧客詳細の同じボタンからやり直せる。
 */
export const registerAsStaff = async (
  form: any,
  actor: User,
  staff: User,
  referrerName: string,
  referrerId?: string
): Promise<boolean> => {
  if (!window.confirm(
    `新しい顧客は作らず、幹部の${staff.name}さん（${(staff.loginId || '').toLowerCase()}）を\n` +
    `紹介者：${referrerName}さんの下に置きます。よろしいですか？`
  )) return false;
  // 先に統合が使える状態か確かめる（使えないのに顧客だけ作られるのを防ぐ）。
  // 存在しない顧客を指定すれば、使える状態なら customer_not_found が返る。
  const probe = await db.mergeCustomerIntoStaff('', staff.loginId, false);
  if (probe.reason !== 'customer_not_found') {
    alert(probe.ok ? '統合の確認に失敗しました。' : reasonMessage(probe.reason));
    return false;
  }
  const created = await db.createCase(form, actor, referrerId);
  if (!created) return false;
  const result = await db.mergeCustomerIntoStaff(created.id, staff.loginId, true);
  if (!result.ok) {
    alert(`${reasonMessage(result.reason)}\n顧客 ${(created.id || '').toLowerCase()} として登録されたままです。顧客詳細から統合し直してください。`);
    return false;
  }
  return true;
};

/** 「この人は幹部の◯◯さんでは？」の表示。ボタンの中身は呼び出し側で決める。 */
const StaffLinkNotice = ({ staff, actionLabel, onAction, disabled }: {
  staff: User;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
}) => (
  <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '12px', padding: '14px 16px', margin: '8px 0 16px' }}>
    <div style={{ fontWeight: 800, color: '#92400e', fontSize: '0.9rem', marginBottom: '10px' }}>
      <i className="fa-solid fa-user-tie" style={{ marginRight: '6px' }}></i>
      この人は幹部の{staff.name}さん（{(staff.loginId || '').toLowerCase()}）では？
    </div>
    <Button onClick={onAction} disabled={disabled} style={{ width: '100%' }}>{actionLabel}</Button>
  </div>
);

export default StaffLinkNotice;
