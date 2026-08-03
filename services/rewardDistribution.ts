import { Case, User, UserRole, RewardRecipientType } from '../types';

/**
 * 報酬を「ECPの取り分」として吸収するアカウントかどうか。
 * 管理者(admin)と共同経営者(co_owner)はECP本体なので、その段の取り分はECPに繰り入れる。
 * 幹部(executive)は個人として紹介報酬を受け取るため、ここには含めない
 * （含めてしまうと幹部の直紹介・2段目報酬が本人に渡らずECPに吸収されてしまう）。
 */
const isEcpAccount = (role?: UserRole): boolean =>
  role === UserRole.ADMIN || role === UserRole.CO_OWNER;

// 人名でよく使われる異体字（旧字体など）を正規字体に統一するためのマップ。
// 「惠子」と「恵子」、「山﨑」と「山崎」のように見た目がほぼ同じでもUnicode上は
// 別の文字のため、単純な文字列比較では一致しないことがある。
const KANJI_VARIANTS: Record<string, string> = {
  '髙': '高', '﨑': '崎', '嵜': '崎', '惠': '恵', '德': '徳', '澤': '沢',
  '廣': '広', '邉': '辺', '邊': '辺', '櫻': '桜', '眞': '真', '榮': '栄',
  '濱': '浜', '濵': '浜', '賴': '頼', '國': '国', '龍': '竜', '靜': '静',
  '齋': '斎', '齊': '斉', '澁': '渋', '瀨': '瀬', '關': '関', '增': '増',
  '莊': '荘', '藏': '蔵', '將': '将', '峯': '峰', '槇': '槙', '舘': '館',
  '曾': '曽', '冨': '富'
};

const normalizeKanji = (s: string): string => s.split('').map(ch => KANJI_VARIANTS[ch] || ch).join('');

// 名前比較用の正規化（全角/半角スペースを除去し、異体字も正規字体に揃える）
const normalizeName = (s?: string): string => normalizeKanji((s || '').replace(/[\s　]/g, ''));

/**
 * 月次報酬明細のマッチ先。通常は案件(Case)だが、幹部・共同経営者が自分名義で運営する
 * ショップは案件レコードを持たないため、スタッフのユーザーアカウント自体もマッチ先に
 * できるようにしている。
 * id には案件なら Case.id、スタッフなら User.loginId が入る（どちらも
 * reward_rows.matched_case_id にそのまま保存できる text）。
 */
export interface MatchTarget {
  id: string;
  name: string;   // オーナー表示名
  label: string;  // セレクトボックス用（"pa0003 / 小野明"）
  kind: 'case' | 'staff';
  referrerId?: string;
}

/** マッチ先として選択できる案件・スタッフの一覧を作る。 */
export const buildMatchTargets = (
  allCases: Case[],
  allUsers: User[],
  resolveCaseName: (c: Case) => string
): MatchTarget[] => {
  const toTarget = (id: string, name: string, kind: 'case' | 'staff', referrerId?: string): MatchTarget => ({
    id,
    name,
    label: `${(id || '').toLowerCase()} / ${name}`,
    kind,
    referrerId
  });
  return [
    ...allCases.map(c => toTarget(c.id, resolveCaseName(c), 'case', c.referrerId)),
    ...allUsers
      .filter(u => u.role === UserRole.CO_OWNER || u.role === UserRole.EXECUTIVE)
      .map(u => toTarget(u.loginId, u.name, 'staff', u.referrerId))
  ];
};

export const findMatchTarget = (id: string | null | undefined, targets: MatchTarget[]): MatchTarget | undefined =>
  id ? targets.find(t => (t.id || '').toLowerCase() === id.toLowerCase()) : undefined;

/**
 * 月次報酬明細の「オーナー名」から、該当するマッチ先を名前一致で探す。
 * 一致しない場合は undefined を返し、呼び出し側で手動マッチングを促す。
 */
export const matchRowToTarget = (
  ownerName: string,
  allCases: Case[],
  allUsers: User[],
  targets: MatchTarget[]
): MatchTarget | undefined => {
  const target = normalizeName(ownerName);
  if (!target) return undefined;

  const matchedCase = allCases.find(c => {
    const repName = normalizeName([c.repLastName, c.repFirstName].filter(Boolean).join(''));
    const company = normalizeName(c.companyName);
    return (repName && repName === target) || (company && company === target);
  });
  if (matchedCase) return findMatchTarget(matchedCase.id, targets);

  // 案件で見つからなければスタッフ名でも照合する（幹部本人名義のショップ）
  const matchedStaff = allUsers.find(u =>
    (u.role === UserRole.CO_OWNER || u.role === UserRole.EXECUTIVE) &&
    normalizeName(u.name) === target
  );
  return matchedStaff ? findMatchTarget(matchedStaff.loginId, targets) : undefined;
};

const findUserByIdentifier = (identifier: string, allUsers: User[]): User | undefined => {
  const id = identifier.toLowerCase();
  return allUsers.find(u => (u.id || '').toLowerCase() === id || (u.loginId || '').toLowerCase() === id);
};

const findCaseByIdentifier = (identifier: string, allCases: Case[]): Case | undefined => {
  const id = identifier.toLowerCase();
  return allCases.find(c => (c.id || '').toLowerCase() === id);
};

/**
 * identifier(User.id 形式・Case.id/loginId 形式のどちらもありうる)から、その人物自身の
 * Case を探す。identifier が User.id(UUID) の場合は Case.id と直接一致しないため、
 * 先に User を特定してから、その User の loginId(=Case.id の規則) で Case を引き直す。
 * これをしないと、法人代表者名などケース側にしか無い情報に到達できない。
 */
const findOwnCase = (identifier: string, allCases: Case[], allUsers: User[]): Case | undefined => {
  const direct = findCaseByIdentifier(identifier, allCases);
  if (direct) return direct;
  const user = findUserByIdentifier(identifier, allUsers);
  return user?.loginId ? findCaseByIdentifier(user.loginId, allCases) : undefined;
};

export interface ResolvedRecipient {
  type: RewardRecipientType;
  userId: string | null;
  name: string;
  amount: number;
}

export interface RewardDistributionResult {
  rewardAmount: number;
  l1: ResolvedRecipient | null; // null = 紹介者不在 or ECP自身 → ECPに吸収
  l2: ResolvedRecipient | null;
  ecpAmount: number;
}

/**
 * ある紹介者識別子(referrerId)を辿り、それがECP（紹介者不在 or ECPアカウント）かどうかを判定する。
 * ECPであれば null を返す（＝この段の取り分はECPが吸収する）。
 */
const resolveReferrer = (
  referrerId: string | undefined,
  allCases: Case[],
  allUsers: User[]
): { userId: string; name: string } | null => {
  if (!referrerId) return null;
  const user = findUserByIdentifier(referrerId, allUsers);
  if (user && isEcpAccount(user.role)) return null;
  const referrerCase = findOwnCase(referrerId, allCases, allUsers);
  // 常に個人名を優先して表示する：案件の代表者名 → ユーザーアカウント名(個人名) → 会社名。
  // 案件の代表者名が未入力の法人案件でも、会社名より先にユーザーアカウントの個人名を
  // 使うことで「誰なのか会社名だとわからない」状態を避ける。会社名はどちらも無いときの
  // 最終手段。
  const name =
    [referrerCase?.repLastName, referrerCase?.repFirstName].filter(Boolean).join(' ') ||
    user?.name ||
    referrerCase?.companyName ||
    referrerId;
  // ツリー画面側のノードは、ユーザーアカウントがあれば User.id、無ければ Case.id を
  // そのノードの識別子として使う（TierTreePage の getTreeChildren と同じ規則）。
  // referrerId 自体は Case によって User.id 形式・loginId(=Case.id)形式が混在して
  // 保存されているため、ここで正規化しておかないとツリー側のノードと一致せず
  // 報酬バッジが表示されなくなる。
  const userId = user?.id || referrerCase?.id || referrerId;
  return { userId, name };
};

/**
 * 報酬額R を、直紹介者(1/2)・その紹介者(1/4)・ECP(残り) に分配する。
 * 紹介チェーンがECPで途切れる段の取り分は、そのままECPに繰り入れる。
 *
 * owner はショップの持ち主。案件(Case)のほか、幹部本人名義のショップでは
 * スタッフのユーザーアカウント(User)を直接渡す。どちらも referrerId しか見ないため、
 * 「自分のショップの紹介報酬を自分が受け取る」形にはならない。
 */
export const distributeReward = (
  owner: { referrerId?: string },
  rewardAmount: number,
  allCases: Case[],
  allUsers: User[]
): RewardDistributionResult => {
  const resolvedL1 = resolveReferrer(owner.referrerId, allCases, allUsers);

  let resolvedL2: { userId: string; name: string } | null = null;
  if (resolvedL1) {
    const l1Case = findOwnCase(resolvedL1.userId, allCases, allUsers);
    const l1User = findUserByIdentifier(resolvedL1.userId, allUsers);
    const l2ReferrerId = l1Case?.referrerId || l1User?.referrerId;
    resolvedL2 = resolveReferrer(l2ReferrerId, allCases, allUsers);
  }

  const l1Amount = Math.round(rewardAmount / 2);
  const l2Amount = Math.round(rewardAmount / 4);
  const ecpAmount = rewardAmount - (resolvedL1 ? l1Amount : 0) - (resolvedL2 ? l2Amount : 0);

  return {
    rewardAmount,
    l1: resolvedL1 ? { type: 'l1', userId: resolvedL1.userId, name: resolvedL1.name, amount: l1Amount } : null,
    l2: resolvedL2 ? { type: 'l2', userId: resolvedL2.userId, name: resolvedL2.name, amount: l2Amount } : null,
    ecpAmount
  };
};
