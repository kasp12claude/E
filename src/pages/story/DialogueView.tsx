import { useMemo, useState } from 'react';
import type { DialogueNode, Effects, StoryState } from './types';
import { applyEffects, check } from './engine';
import { char } from './world';
import { EffectChips } from './EffectChips';

/**
 * Viser en dialog node for node. Valg kan ha betingelser og effekter.
 * onEffects kalles for hver effekt som utløses underveis (lagres med en gang).
 */
export function DialogueView({
  nodes,
  start,
  state,
  playerName,
  onEffects,
  onEnd,
  title,
}: {
  nodes: DialogueNode[];
  start: string;
  state: StoryState;
  playerName: string;
  onEffects: (e: Effects) => void;
  /** choicesMade = antall valg spilleren tok underveis */
  onEnd: (end: 'done' | 'success' | 'fail', lastNode: DialogueNode, choicesMade: number) => void;
  title?: string;
}) {
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const [cur, setCur] = useState(start);
  const [history, setHistory] = useState<{ node: DialogueNode; chosen?: string; effects?: Effects }[]>([]);
  const node = byId.get(cur);
  // Lokal kopi av tilstanden for å vurdere betingelser i valgene underveis
  const [local, setLocal] = useState(state);

  if (!node) return <div className="notice notice-danger">Fant ikke dialognoden «{cur}».</div>;

  const go = (next: string | undefined, chosen?: string, effects?: Effects) => {
    const merged: Effects | undefined = effects || node.effects ? { ...node.effects, ...effects } : undefined;
    if (node.effects) onEffects(node.effects);
    if (effects) onEffects(effects);
    setLocal((s) => applyEffects(applyEffects(s, node.effects), effects));
    setHistory((h) => [...h, { node, chosen, effects: merged }]);
    if (node.end) return onEnd(node.end, node, history.filter((h) => h.chosen).length + (chosen ? 1 : 0));
    if (next) setCur(next);
  };

  const who = node.speaker ? char(node.speaker) : undefined;
  const name = node.speaker === 'deg' ? playerName : who?.name ?? '';
  const choices = (node.choices ?? []).filter((c) => check(c.if, local));

  return (
    <div className="dialogue">
      {title && <div className="dialogue-title">{title}</div>}
      <div className="dialogue-history">
        {history.slice(-4).map((h, i) => {
          const hw = h.node.speaker ? char(h.node.speaker) : undefined;
          return (
            <div key={i} className="dlg-old">
              <span className="dlg-old-name" style={{ color: hw?.color }}>
                {h.node.speaker === 'deg' ? playerName : hw?.name}
              </span>{' '}
              {h.node.text}
              {h.chosen && <div className="dlg-old-choice">➜ {h.chosen}</div>}
            </div>
          );
        })}
      </div>
      <div className={`dlg-bubble ${node.speaker === 'forteller' ? 'narrator' : ''}`}>
        {node.speaker !== 'forteller' && who && (
          <div className="dlg-avatar" style={{ background: who.color }} title={who.role}>
            {who.avatar}
          </div>
        )}
        <div className="dlg-body">
          {name && (
            <div className="dlg-name" style={{ color: who?.color }}>
              {name}
              {who?.role && <span className="dlg-role"> · {who.role}</span>}
            </div>
          )}
          <div className="dlg-text">{node.text}</div>
          {node.effects && <EffectChips e={node.effects} />}
        </div>
      </div>
      <div className="dlg-choices">
        {choices.length > 0 ? (
          choices.map((c, i) => (
            <button key={i} className="dlg-choice" onClick={() => go(c.next, c.text, c.effects)}>
              <span className="dlg-choice-n">{i + 1}</span>
              <span>{c.text}</span>
              {c.tag && <span className="badge badge-green">{c.tag}</span>}
            </button>
          ))
        ) : (
          <button className="btn btn-primary" onClick={() => go(node.next)} autoFocus>
            {node.end ? 'Avslutt' : 'Fortsett ➜'}
          </button>
        )}
      </div>
    </div>
  );
}
