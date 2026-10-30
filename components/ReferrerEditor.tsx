import React, { useMemo, useState } from 'react';
import { db } from '../services/dbService';
import { Case, User, UserRole } from '../types';
import { MatchTarget, buildMatchTargets, resolveCaseDisplayName } from '../services/rewardDistribution';
import { MatchTargetPicker } from './MatchTargetCombobox';

const REASON_MESSAGES: Record<string, string> = {
  forbidden: '紹介者を変更できるのは管理者(admin)のみです。',
  target_not_found: '対象が見つかりません。',
  target_is_admin: '管理者の紹介者は変更できません。',
  referrer_not_found: '選んだ紹介者が見つかりません。',
  self: '本人を紹介者にはできません。',
  cycle: '選んだ人は、この人の傘下にいます。紹介ツリーが輪になるため変更できません。'
};

/** 紹介者として表示する名前。顧客なら代表者名、スタッフならアカウント名。 */
const referrerDisplayName = (referrerId: string | undefined, allUsers: User[], allCases: Case[]): string => {
  if (!referrerId) return 'ECP（紹介者なし）';
  const key = referrerId.toLowerCase();
  const u = allUsers.find(x => (x.id || '').toLowerCase() === key || (x.loginId || '').toLowerCase() === key);
  if (!u) return '不明';
  if (u.role === UserRole.ADMIN) return 'ECP（admin）';
  const c = allCases.find(x => (x.id || '').toLowerCase() === (u.loginId || '').toLowerCase());
  return `${c ? resolveCaseDisplayName(c, allUsers) : u.name}（${(u.loginId || '').toLowerCase()}）`;
};

/**
 * 紹介ツリーで付ける場所を間違えたときの紹介者の付け替え。管理者(admin)にだけ出す。
 * 過去の月の報酬は当時の紹介者のまま残り、変更後に取り込む月から新しい紹介者で計算される。
 */
const ReferrerEditor = ({ target, allUsers, allCases, onChanged }: {
  target: { loginId: string; name: string; referrerId?: string };
  allUsers: User[];
  allCases: Case[];
  onChanged: () => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const candidates = useMemo<MatchTarget[]>(() => {
    const self = (target.loginId || '').toLowerCase();
    const admin = allUsers.find(u => u.role === UserRole.ADMIN);
    return [
      ...(admin ? [{ id: admin.loginId, name: 'ECP（admin）', label: `${(admin.loginId || '').toLowerCase()} / ECP`, kind: 'staff' as const }] : []),
      ...buildMatchTargets(allCases, allUsers, c => resolveCaseDisplayName(c, allUsers))
    ].filter(t => (t.id || '').toLowerCase() !== self);
  }, [allUsers, allCases, target.loginId]);

  const handleSelect = async (t: MatchTarget | null) => {
    if (!t) return;
    const ok = window.confirm(
      `${target.name}さんの紹介者を\n` +
      `${referrerDisplayName(target.referrerId, allUsers, allCases)} → ${t.name}（${(t.id || '').toLowerCase()}）\n` +
      `に変更します。傘下の人も一緒に移ります。\n\n` +
      `確定済みの月の報酬は今の紹介者のままです。これから取り込む月から新しい紹介者で計算されます。`
    );
    if (!ok) return;
    setSaving(true);
    try {
      const res = await db.changeReferrer(target.loginId, t.id);
      if (!res.ok) {
        alert(REASON_MESSAGES[res.reason || ''] || `変更に失敗しました（${res.reason || '不明なエラー'}）。`);
        return;
      }
      setEditing(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <span style={{ fontWeight: 700 }}>{referrerDisplayName(target.referrerId, allUsers, allCases)}</span>
      {editing ? (
        <>
          <MatchTargetPicker targets={candidates} value={null} onSelect={handleSelect} disabled={saving} style={{ minWidth: '240px' }} />
          <button type="button" onClick={() => setEditing(false)} disabled={saving}
            style={{ border: 'none', background: 'none', color: 'var(--text-sub)', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>
            やめる
          </button>
        </>
      ) : (
        <button type="button" onClick={() => setEditing(true)}
          style={{ border: '1.5px solid var(--border)', borderRadius: '8px', background: 'var(--bg-card)', padding: '4px 10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>
          <i className="fa-solid fa-arrow-right-arrow-left" style={{ marginRight: '4px' }}></i>紹介者を変更
        </button>
      )}
    </div>
  );
};

export default ReferrerEditor;
