import { useEffect, useMemo, useState } from 'react';
import { Info, Lightbulb, Trash2, X } from 'lucide-react';
import { COLOR_HEX, COLOR_NAME, conn, hint, template, type CableDef, type CircuitSpec, type WireColor } from './wiring';
import { TOOLS, toolName, toolRef, type Tool } from './tools';

interface End {
  id: string;
  color: WireColor;
  role: string;
  cable: CableDef;
  x: number;
  y: number;
}

type Side = 'left' | 'top' | 'right' | 'bottom';
const SIDES: Side[] = ['left', 'top', 'right', 'bottom'];
const W = 700;
const H = 420;

/** Plasserer kablene rundt boksen og regner ut hvor lederendene ligger */
function layoutCables(cables: CableDef[]) {
  const ends: End[] = [];
  const sheaths: { cable: CableDef; side: Side; x1: number; y1: number; x2: number; y2: number; lx: number; ly: number; anchor: 'start' | 'middle' | 'end' }[] = [];
  cables.forEach((cb, i) => {
    const side = SIDES[i % 4];
    const n = cb.conductors.length;
    cb.conductors.forEach((k, j) => {
      const o = j - (n - 1) / 2;
      const pos =
        side === 'left'
          ? { x: 160, y: 210 + o * 62 }
          : side === 'right'
            ? { x: W - 160, y: 210 + o * 62 }
            : side === 'top'
              ? { x: 350 + o * 78, y: 118 }
              : { x: 350 + o * 78, y: H - 108 };
      ends.push({ id: `${cb.id}.${k.color}`, color: k.color, role: k.role, cable: cb, ...pos });
    });
    if (side === 'left') sheaths.push({ cable: cb, side, x1: 0, y1: 210, x2: 92, y2: 210, lx: 12, ly: 190, anchor: 'start' });
    if (side === 'right') sheaths.push({ cable: cb, side, x1: W, y1: 210, x2: W - 92, y2: 210, lx: W - 12, ly: 190, anchor: 'end' });
    if (side === 'top') sheaths.push({ cable: cb, side, x1: 350, y1: 0, x2: 350, y2: 58, lx: 362, ly: 22, anchor: 'start' });
    if (side === 'bottom') sheaths.push({ cable: cb, side, x1: 350, y1: H, x2: 350, y2: H - 48, lx: 362, ly: H - 12, anchor: 'start' });
  });
  return { ends, sheaths };
}

export type HelpLevel = 1 | 2 | 3;

export function WiringPuzzle({
  roomName,
  spec,
  conns,
  help,
  onChange,
  onClose,
  onHint,
  hintShown,
  tool,
  setTool,
  stripped,
  onStrip,
}: {
  /** Verktøyet i hånda: avisoleringstang avisolerer, koblingsklemmer skjøter */
  tool: Tool;
  setTool: (t: Tool) => void;
  stripped: string[];
  onStrip: (endId: string) => void;
  roomName: string;
  spec: CircuitSpec;
  conns: string[];
  /** 1 = lærling (lederne forklart), 2 = montør (bare farger), 3 = mester (ingen hint) */
  help: HelpLevel;
  onChange: (c: string[]) => void;
  onClose: () => void;
  onHint: () => void;
  hintShown: boolean;
}) {
  const [sel, setSel] = useState<string | null>(null);
  const t = useMemo(() => template(spec), [spec]);
  const { ends, sheaths } = useMemo(() => layoutCables(t.cables), [t]);
  const byId = useMemo(() => new Map(ends.map((e) => [e.id, e])), [ends]);

  const [msg, setMsg] = useState<string | null>(null);
  // Ny melding når man bytter verktøy
  useEffect(() => {
    setMsg(null);
    if (tool !== 'klemme') setSel(null);
  }, [tool]);
  const isStripped = (id: string) => stripped.includes(id);
  const click = (id: string) => {
    setMsg(null);
    if (tool === 'tang') {
      if (isStripped(id)) return setMsg('Denne lederen er allerede avisolert.');
      return onStrip(id);
    }
    if (tool !== 'klemme') return setMsg(`${tool === 'hand' ? 'Du har ingenting i hånda' : `Du har ${toolName(tool).toLowerCase()} i hånda`}. Bruk ${toolRef('tang')} for å avisolere og ${toolRef('klemme')} for å skjøte.`);
    if (!isStripped(id)) return setMsg(`Lederen er fortsatt isolert. Avisoler den først med ${toolRef('tang')}.`);
    if (!sel) return setSel(id);
    if (sel === id) return setSel(null);
    const key = conn(sel, id);
    onChange(conns.includes(key) ? conns.filter((c) => c !== key) : [...conns, key]);
    setSel(null);
  };

  const sheathPos = (cb: CableDef) => sheaths.find((s) => s.cable === cb)!;

  return (
    <div className="game-overlay">
      <div className="game-dialog wide">
        <div className="game-dialog-head">
          <span>Koblingsboks – {roomName}</span>
          <span className="spacer" />
          <button className="icon-btn" onClick={onClose} title="Lukk boksen">
            <X size={18} />
          </button>
        </div>
        <div className="row small" style={{ marginBottom: 6 }}>
          <span className="badge badge-blue">{t.name}</span>
          <span className="badge">{spec.net === 'IT' ? 'IT-anlegg (L1, L2, PE)' : 'TN-anlegg (L, N, PE)'}</span>
          <span className="badge">{help === 1 ? 'Lærling: lederne er forklart' : help === 2 ? 'Montør: bare farger' : 'Mester: ingen hjelp'}</span>
        </div>
        <div className="puzzle-tools">
          {TOOLS.filter((x) => x.id === 'tang' || x.id === 'klemme').map((x) => (
            <button key={x.id} className={`btn btn-sm ${tool === x.id ? 'btn-primary' : ''}`} onClick={() => setTool(x.id)}>
              {x.icon} {x.name} <kbd>{x.key}</kbd>
            </button>
          ))}
          <span className="small muted">
            {tool === 'tang'
              ? 'Klikk på lederendene du skal bruke for å avisolere dem.'
              : tool === 'klemme'
                ? 'Klikk på en avisolert lederende og så på en annen for å skjøte dem. Klikk på en skjøt for å fjerne den.'
                : 'Velg avisoleringstang eller koblingsklemmer.'}
          </span>
        </div>
        {msg && <div className="notice notice-warn small" style={{ marginBottom: 6 }}>{msg}</div>}
        <svg viewBox={`0 0 ${W} ${H}`} className="puzzle-svg">
          <rect x={30} y={22} width={W - 60} height={H - 44} rx={16} fill="#0b1222" stroke="#334155" strokeWidth={2} />
          {/* Kabler inn i boksen */}
          {sheaths.map((s) => (
            <g key={s.cable.id}>
              <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#e5e7eb" strokeWidth={18} strokeLinecap="round" />
              <text x={s.lx} y={s.ly} fill="#cbd5e1" fontSize={13} fontWeight={700} textAnchor={s.anchor}>
                {s.cable.label}
              </text>
            </g>
          ))}
          {/* Lederne fra kappen ut til endene */}
          {ends.map((e) => {
            const s = sheathPos(e.cable);
            return (
              <g key={`k-${e.id}`} opacity={0.6}>
                {e.color === 'sv' && <line x1={s.x2} y1={s.y2} x2={e.x} y2={e.y} stroke="#94a3b8" strokeWidth={7} />}
                <line x1={s.x2} y1={s.y2} x2={e.x} y2={e.y} stroke={COLOR_HEX[e.color]} strokeWidth={5} />
              </g>
            );
          })}
          {/* Skjøter */}
          {conns.map((c) => {
            const [a, b] = c.split('|');
            const pa = byId.get(a);
            const pb = byId.get(b);
            if (!pa || !pb) return null;
            const mx = (pa.x + pb.x) / 2;
            const my = (pa.y + pb.y) / 2;
            const d = `M${pa.x},${pa.y} Q${mx + (pb.y - pa.y) * 0.15},${my - (pb.x - pa.x) * 0.15} ${pb.x},${pb.y}`;
            const col = pa.color === 'gg' || pb.color === 'gg' ? 'gg' : pa.color;
            return (
              <g key={c} onClick={() => onChange(conns.filter((x) => x !== c))} style={{ cursor: 'pointer' }}>
                <title>Klikk for å fjerne skjøten</title>
                <path d={d} fill="none" stroke="transparent" strokeWidth={16} />
                {/* Svart leder får lys kant så den synes mot den mørke bakgrunnen */}
                {col === 'sv' && <path d={d} fill="none" stroke="#cbd5e1" strokeWidth={9} strokeLinecap="round" />}
                <path d={d} fill="none" stroke={COLOR_HEX[col]} strokeWidth={6} strokeLinecap="round" />
                {col === 'gg' && <path d={d} fill="none" stroke="#facc15" strokeWidth={6} strokeDasharray="8 10" strokeLinecap="round" />}
              </g>
            );
          })}
          {/* Lederender */}
          {ends.map((e) => {
            const active = sel === e.id;
            return (
              <g key={e.id} onClick={() => click(e.id)} style={{ cursor: 'pointer' }}>
                <title>{(help === 1 ? `${e.cable.label}: ${COLOR_NAME[e.color]} – ${e.role}` : `${e.cable.label}: ${COLOR_NAME[e.color]}`) + (isStripped(e.id) ? ' (avisolert)' : ' (isolert)')}</title>
                <circle cx={e.x} cy={e.y} r={15} fill="#1e293b" stroke={active ? '#22c55e' : '#94a3b8'} strokeWidth={active ? 4 : 2} />
                {e.color === 'gg' ? (
                  <circle cx={e.x} cy={e.y} r={9} fill={COLOR_HEX.gg} stroke="#facc15" strokeWidth={4} strokeDasharray="4 4" />
                ) : (
                  <circle cx={e.x} cy={e.y} r={9} fill={COLOR_HEX[e.color]} stroke={e.color === 'sv' ? '#64748b' : 'none'} />
                )}
                {/* Avisolert ende viser blankt kobber */}
                {isStripped(e.id) ? <circle cx={e.x} cy={e.y} r={4} fill="#d97706" stroke="#fde68a" strokeWidth={1.5} /> : null}
                <text x={e.x} y={e.y + 29} fill="#e2e8f0" fontSize={11} textAnchor="middle" fontWeight={600}>
                  {COLOR_NAME[e.color]}
                  {isStripped(e.id) ? ' ✂' : ''}
                </text>
                {help === 1 && (
                  <text x={e.x} y={e.y + 42} fill="#94a3b8" fontSize={9.5} textAnchor="middle">
                    {e.role.length > 26 ? e.role.slice(0, 25) + '…' : e.role}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {sel && (
          <div className="small" style={{ marginTop: 6 }}>
            Valgt: <b>{byId.get(sel)?.cable.label}, {COLOR_NAME[byId.get(sel)!.color]}</b>
            {help === 1 && ` (${byId.get(sel)?.role})`} – klikk på lederen den skal skjøtes til.
          </div>
        )}
        <div className="notice notice-info" style={{ marginTop: 10 }}>
          <Info size={18} color="var(--accent-2)" />
          <div className="small">{t.info}</div>
        </div>
        {hintShown && (
          <div className="notice notice-warn">
            <Lightbulb size={18} color="var(--warn)" />
            <div className="small">{hint(spec)}</div>
          </div>
        )}
        <div className="row" style={{ marginTop: 12 }}>
          {!hintShown && help < 3 && (
            <button className="btn btn-sm" onClick={onHint}>
              <Lightbulb size={14} /> Hint (−20 poeng)
            </button>
          )}
          {help === 3 && <span className="small muted">Mesteroppdrag: ingen hint.</span>}
          <button className="btn btn-sm" onClick={() => onChange([])}>
            <Trash2 size={14} /> Fjern alle skjøter
          </button>
          <span className="small muted">{conns.length} skjøter</span>
          <span className="spacer" />
          <button className="btn btn-primary" onClick={onClose}>
            Lukk boksen
          </button>
        </div>
      </div>
    </div>
  );
}
