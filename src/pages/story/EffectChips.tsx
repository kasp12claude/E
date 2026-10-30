import type { Effects } from './types';
import { char } from './world';
import { SHOP } from './world';

/** Små merker som viser hva et valg/oppdrag ga (XP, penger, omdømme …) */
export function EffectChips({ e, big }: { e: Effects; big?: boolean }) {
  const chips: { text: string; kind: 'pos' | 'neg' | 'neu' }[] = [];
  if (e.xp) chips.push({ text: `${e.xp > 0 ? '+' : ''}${e.xp} XP`, kind: e.xp > 0 ? 'pos' : 'neg' });
  if (e.money) chips.push({ text: `${e.money > 0 ? '+' : ''}${e.money} kr`, kind: e.money > 0 ? 'pos' : 'neg' });
  if (e.reputation) chips.push({ text: `${e.reputation > 0 ? '+' : ''}${e.reputation} omdømme`, kind: e.reputation > 0 ? 'pos' : 'neg' });
  for (const [id, v] of Object.entries(e.relations ?? {})) {
    const c = char(id);
    if (c && v) chips.push({ text: `${c.name.split(' ')[0]} ${v > 0 ? '♥'.repeat(Math.min(3, v)) : '−'.repeat(Math.min(3, -v))}`, kind: v > 0 ? 'pos' : 'neg' });
  }
  for (const it of e.items ?? []) chips.push({ text: `Fikk: ${SHOP.find((s) => s.id === it)?.name ?? it}`, kind: 'pos' });
  if (!chips.length) return null;
  return (
    <div className={`effect-chips ${big ? 'big' : ''}`}>
      {chips.map((c, i) => (
        <span key={i} className={`effect-chip ${c.kind}`}>
          {c.text}
        </span>
      ))}
    </div>
  );
}
