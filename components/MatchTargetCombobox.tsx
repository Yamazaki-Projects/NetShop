import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MatchTarget, findMatchTarget, normalizeForSearch } from '../services/rewardDistribution';

/**
 * 案件・スタッフの候補を検索文字列で絞り込む。
 * 名前の前方一致 → 案件IDの前方一致 → ラベル全体の部分一致、の順に並べる。
 * 表記揺れ（スペース有無・旧字体・ID の大文字小文字）は normalizeForSearch で吸収する。
 */
export const filterMatchTargets = (targets: MatchTarget[], query: string, limit?: number): MatchTarget[] => {
  const q = normalizeForSearch(query);
  const matched = !q
    ? targets
    : targets
        .map(t => {
          if (normalizeForSearch(t.name).startsWith(q)) return { t, score: 0 };
          if (normalizeForSearch(t.id).startsWith(q)) return { t, score: 1 };
          if (normalizeForSearch(t.label).includes(q)) return { t, score: 2 };
          return null;
        })
        .filter((x): x is { t: MatchTarget; score: number } => x !== null)
        .sort((a, b) => a.score - b.score)
        .map(x => x.t);
  return limit ? matched.slice(0, limit) : matched;
};

interface DropdownPosition {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
}

/**
 * 候補リストの表示位置。行の編集テーブルは overflow 付きのコンテナに入っているため、
 * リストをその中に絶対配置すると見切れる。body 直下（ポータル）に fixed で出し、
 * スクロール・リサイズのたびにアンカーの位置を測り直して追従させる。
 */
const useDropdownPosition = (open: boolean, anchorRef: React.RefObject<HTMLElement | null>, minWidth: number) => {
  const [pos, setPos] = useState<DropdownPosition | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom - 12;
      const spaceAbove = r.top - 12;
      const openUpward = spaceBelow < 200 && spaceAbove > spaceBelow;
      const maxHeight = Math.min(320, Math.max(140, openUpward ? spaceAbove : spaceBelow));
      const width = Math.min(Math.max(minWidth, r.width), window.innerWidth - 16);
      setPos({
        left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
        top: openUpward ? Math.max(8, r.top - maxHeight - 4) : r.bottom + 4,
        width,
        maxHeight
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, anchorRef, minWidth]);

  return pos;
};

/** アンカーとリストの外側を押したら閉じる。 */
const useCloseOnOutside = (
  open: boolean,
  close: () => void,
  refs: React.RefObject<HTMLElement | null>[]
) => {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const node = e.target as Node;
      if (refs.some(r => r.current?.contains(node))) return;
      close();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open, close, refs]);
};

const panelStyle = (pos: DropdownPosition): React.CSSProperties => ({
  position: 'fixed',
  left: pos.left,
  top: pos.top,
  width: pos.width,
  maxHeight: pos.maxHeight,
  overflowY: 'auto',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18)',
  zIndex: 1000,
  padding: '4px'
});

const groupHeaderStyle: React.CSSProperties = {
  padding: '8px 10px 4px',
  fontSize: '0.7rem',
  fontWeight: 800,
  color: 'var(--text-sub)'
};

const emptyStyle: React.CSSProperties = {
  padding: '14px 10px',
  fontSize: '0.8rem',
  color: 'var(--text-sub)',
  fontWeight: 700,
  textAlign: 'center'
};

const OptionRow = ({ target, index, active, selected, onPick, onHover }: {
  target: MatchTarget;
  index: number;
  active: boolean;
  selected: boolean;
  onPick: (t: MatchTarget) => void;
  onHover: (index: number) => void;
}) => (
  <div
    data-option-index={index}
    role="option"
    aria-selected={selected}
    onMouseEnter={() => onHover(index)}
    // blur より先に確定させるため mousedown で拾う
    onMouseDown={e => {
      e.preventDefault();
      onPick(target);
    }}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '8px',
      padding: '8px 10px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '0.8rem',
      fontWeight: selected ? 800 : 600,
      color: 'var(--text-main)',
      background: active ? 'rgba(79, 70, 229, 0.12)' : 'transparent'
    }}
  >
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{target.label}</span>
    {selected && <i className="fa-solid fa-check" style={{ color: 'var(--primary)', fontSize: '0.75rem' }}></i>}
  </div>
);

/** 矢印キーで移動した候補を、はみ出していたら見える位置まで送る。 */
const useScrollActiveIntoView = (panelRef: React.RefObject<HTMLElement | null>, active: number, open: boolean) => {
  useEffect(() => {
    if (!open) return;
    const el = panelRef.current?.querySelector(`[data-option-index="${active}"]`);
    (el as HTMLElement | null)?.scrollIntoView({ block: 'nearest' });
  }, [panelRef, active, open]);
};

const moveActive = (e: React.KeyboardEvent, count: number, active: number, setActive: (n: number) => void): boolean => {
  if (count === 0) return false;
  if (e.key === 'ArrowDown') {
    setActive((active + 1) % count);
    return true;
  }
  if (e.key === 'ArrowUp') {
    setActive((active - 1 + count) % count);
    return true;
  }
  return false;
};

/**
 * 「対応する案件・スタッフ」の選択欄。
 * 案件が増えると素の select では目当ての行まで辿り着けないため、検索欄付きのリストにしている。
 */
export const MatchTargetPicker = ({ targets, value, onSelect, style, disabled }: {
  targets: MatchTarget[];
  value: string | null;
  onSelect: (target: MatchTarget | null) => void;
  style?: React.CSSProperties;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const refs = useMemo(() => [anchorRef, panelRef], []);

  const selected = useMemo(() => findMatchTarget(value, targets), [value, targets]);
  const filtered = useMemo(() => filterMatchTargets(targets, query), [targets, query]);
  const cases = useMemo(() => filtered.filter(t => t.kind === 'case'), [filtered]);
  const staff = useMemo(() => filtered.filter(t => t.kind === 'staff'), [filtered]);
  const ordered = useMemo(() => [...cases, ...staff], [cases, staff]);

  const pos = useDropdownPosition(open, anchorRef, 280);
  const close = () => setOpen(false);
  useCloseOnOutside(open, close, refs);
  useScrollActiveIntoView(panelRef, active, open);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    // ポータルの描画後にフォーカスを当てる
    const id = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const pick = (t: MatchTarget | null) => {
    onSelect(t);
    setOpen(false);
    anchorRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (moveActive(e, ordered.length, active, setActive)) {
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (ordered[active]) pick(ordered[active]);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      anchorRef.current?.focus();
    }
  };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        onKeyDown={e => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          width: '100%',
          minHeight: '32px',
          padding: '4px 8px',
          fontSize: '0.8rem',
          fontWeight: selected ? 700 : 500,
          textAlign: 'left',
          border: `1px solid ${selected ? 'var(--border)' : '#f59e0b'}`,
          borderRadius: '6px',
          background: 'var(--bg-main)',
          color: selected ? 'var(--text-main)' : 'var(--text-sub)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxSizing: 'border-box',
          ...style
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : '-- 選択してください --'}
        </span>
        <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.65rem', color: 'var(--text-sub)', flexShrink: 0 }}></i>
      </button>

      {open && pos && createPortal(
        <div ref={panelRef} style={panelStyle(pos)} role="listbox" onKeyDown={handleKeyDown}>
          <div style={{ padding: '4px 4px 8px', position: 'sticky', top: 0, background: 'var(--bg-card)' }}>
            <input
              ref={searchRef}
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="名前・案件IDで検索"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: '34px',
                padding: '6px 10px',
                fontSize: '0.8rem',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: 'var(--bg-main)',
                color: 'var(--text-main)'
              }}
            />
          </div>

          {value && (
            <div
              onMouseDown={e => {
                e.preventDefault();
                pick(null);
              }}
              style={{ padding: '8px 10px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-sub)', cursor: 'pointer', borderRadius: '6px' }}
            >
              選択を解除する
            </div>
          )}

          {ordered.length === 0 ? (
            <div style={emptyStyle}>該当する案件・スタッフがありません</div>
          ) : (
            <>
              {cases.length > 0 && <div style={groupHeaderStyle}>案件</div>}
              {cases.map((t, i) => (
                <OptionRow
                  key={t.id}
                  target={t}
                  index={i}
                  active={active === i}
                  selected={t.id === value}
                  onPick={pick}
                  onHover={setActive}
                />
              ))}
              {staff.length > 0 && <div style={groupHeaderStyle}>スタッフ本人のショップ</div>}
              {staff.map((t, i) => (
                <OptionRow
                  key={t.id}
                  target={t}
                  index={cases.length + i}
                  active={active === cases.length + i}
                  selected={t.id === value}
                  onPick={pick}
                  onHover={setActive}
                />
              ))}
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
};

/**
 * オーナー名の入力欄。打った文字に合う案件・スタッフを候補として出し、
 * 選ぶとオーナー名と案件の紐付けを同時に確定する（明細の表記が案件側と違っても手で直せる）。
 */
export const OwnerNameInput = ({ value, targets, onChange, onPick, style, matchedId }: {
  value: string;
  targets: MatchTarget[];
  onChange: (name: string) => void;
  onPick: (target: MatchTarget) => void;
  style?: React.CSSProperties;
  matchedId?: string | null;
}) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const refs = useMemo(() => [anchorRef, panelRef], []);

  const suggestions = useMemo(
    () => (value.trim() ? filterMatchTargets(targets, value, 8) : []),
    [value, targets]
  );

  const pos = useDropdownPosition(open && suggestions.length > 0, anchorRef, 260);
  const close = () => setOpen(false);
  useCloseOnOutside(open, close, refs);
  useScrollActiveIntoView(panelRef, active, open);

  const pick = (t: MatchTarget) => {
    onPick(t);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        e.preventDefault();
        setOpen(true);
        setActive(0);
      }
      return;
    }
    if (moveActive(e, suggestions.length, active, setActive)) {
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter' && suggestions[active]) {
      e.preventDefault();
      pick(suggestions[active]);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={anchorRef} style={{ width: '100%' }}>
      <input
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        style={style}
      />

      {open && pos && suggestions.length > 0 && createPortal(
        <div ref={panelRef} style={panelStyle(pos)} role="listbox">
          <div style={groupHeaderStyle}>候補</div>
          {suggestions.map((t, i) => (
            <OptionRow
              key={t.id}
              target={t}
              index={i}
              active={active === i}
              selected={t.id === matchedId}
              onPick={pick}
              onHover={setActive}
            />
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};
