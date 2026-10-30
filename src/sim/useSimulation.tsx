import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Play, RotateCcw, Square, XCircle } from 'lucide-react';
import type { ComponentEl, DrawingDoc } from '../types';
import { getSymbol } from '../library/symbols';
import type { SimOverlay } from '../editor/Canvas';
import { terminalsOf } from '../editor/geometry';
import { emptySimState, simulate, type SimResult, type SimState } from './solver';
import { SafetyNotice } from '../components/ui';
import { fmt } from '../utils/id';

// Den numeriske modellen gir bittesmå restverdier (lekkasje/brytere på 1 mΩ) – vis dem som 0
const fmtV = (v: number) => `${fmt(Math.abs(v) < 1e-3 ? 0 : v, 3)} V`;
const fmtI = (i: number) => (Math.abs(i) < 1e-6 ? '0 mA' : Math.abs(i) < 1 ? `${fmt(i * 1000, 3)} mA` : `${fmt(i, 3)} A`);

/** Kobler simulatoren til tegneflaten: tilstand, interaksjon, overlegg og resultatpanel. */
export function useSimulation(doc: DrawingDoc, initiallyActive = false) {
  const [active, setActive] = useState(initiallyActive);
  const [state, setState] = useState<SimState>(emptySimState);
  const [tick, setTick] = useState(0);
  const [showVoltages, setShowVoltages] = useState(true);
  const [showCurrents, setShowCurrents] = useState(true);
  const timers = useRef<SimState['timers']>({});

  const result: SimResult | null = useMemo(() => {
    if (!active) return null;
    return simulate(doc.elements, { ...state, timers: timers.current }, Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, doc.elements, state, tick]);

  // Lagre utløste vern og spoletilstand slik at de huskes til neste beregning
  useEffect(() => {
    if (!result) return;
    const trippedChanged = Object.keys(result.tripped).some((k) => !!result.tripped[k] !== !!state.tripped[k]);
    const coilsChanged = Object.keys(result.coils).some((k) => !!result.coils[k] !== !!state.coils?.[k]);
    if (trippedChanged || coilsChanged) setState((s) => ({ ...s, tripped: result.tripped, coils: result.coils }));
  }, [result, state.tripped, state.coils]);

  // Tidsreléer: oppdater jevnlig mens tiden går
  useEffect(() => {
    if (!result?.timersRunning) return;
    const t = setTimeout(() => setTick((n) => n + 1), 150);
    return () => clearTimeout(t);
  }, [result]);

  const reset = () => {
    timers.current = {};
    setState(emptySimState());
  };

  const onComponentDown = (el: ComponentEl) => {
    const role = getSymbol(el.symbolId)?.sim;
    setState((s) => {
      const n = { ...s, switches: { ...s.switches }, pressed: { ...s.pressed }, tripped: { ...s.tripped } };
      switch (role) {
        case 'switch': {
          const cur = n.switches[el.id] ?? (el.symbolId === 'switch-nc' ? el.props.state !== 'Åpen' : el.props.state === 'Lukket');
          n.switches[el.id] = !cur;
          break;
        }
        case 'changeover': {
          const cur = n.switches[el.id] ?? el.props.pos === '2';
          n.switches[el.id] = !cur;
          break;
        }
        case 'pushbutton':
          n.pressed[el.id] = true;
          break;
        case 'fuse':
          if (n.tripped[el.id]) n.tripped[el.id] = false;
          break;
        case 'breaker':
          if (n.tripped[el.id]) {
            n.tripped[el.id] = false;
            n.switches[el.id] = true;
          } else n.switches[el.id] = !(n.switches[el.id] ?? el.props.state !== 'Av');
          break;
        case 'overload-nc': {
          const closed = n.switches[el.id] ?? el.props.state !== 'Ja';
          n.switches[el.id] = !closed;
          break;
        }
        default:
          return s;
      }
      return n;
    });
  };
  const onComponentUp = (el: ComponentEl) => {
    if (getSymbol(el.symbolId)?.sim === 'pushbutton') setState((s) => ({ ...s, pressed: { ...s.pressed, [el.id]: false } }));
  };

  const overlay: SimOverlay | undefined = useMemo(() => {
    if (!active || !result) return undefined;
    const wireColors: Record<string, string> = {};
    const maxV = Math.max(1, ...result.netVoltage.map((v) => Math.abs(v)).filter(Number.isFinite));
    for (const [wid, net] of result.netlist.netOfWire) {
      const v = result.netVoltage[net];
      if (!Number.isFinite(v)) continue;
      if (Math.abs(v) < 0.05) wireColors[wid] = '#3b82f6';
      else {
        const t = Math.min(1, Math.abs(v) / maxV);
        wireColors[wid] = `hsl(${30 - t * 30}, 90%, ${60 - t * 8}%)`;
      }
    }
    const notes: Record<string, string> = {};
    if (showCurrents) {
      for (const e of doc.elements) {
        if (e.type !== 'component') continue;
        const role = getSymbol(e.symbolId)?.sim;
        if (!role || ['switch', 'pushbutton', 'changeover', 'ground', 'conductor', 'relay-no', 'relay-nc', 'overload-nc'].includes(role)) continue;
        const I = result.current[e.id];
        const U = result.voltageAcross[e.id];
        if (I === undefined) continue;
        notes[e.id] = role === 'fuse' || role === 'breaker' ? `I = ${fmtI(Math.abs(I))}` : `${fmtV(Math.abs(U ?? 0))} · ${fmtI(Math.abs(I))}`;
      }
    }
    // Spenningsmerker: ett per nett, ved første terminal
    const tags: { x: number; y: number; v: number }[] = [];
    if (showVoltages) {
      const seen = new Set<number>();
      for (const e of doc.elements) {
        if (e.type !== 'component') continue;
        for (const t of terminalsOf(e)) {
          const net = result.netlist.netOfTerminal.get(`${e.id}:${t.id}`);
          if (net === undefined || seen.has(net)) continue;
          seen.add(net);
          const v = result.netVoltage[net];
          if (Number.isFinite(v)) tags.push({ x: t.x, y: t.y, v });
        }
      }
    }
    return {
      active: true,
      opts: { sim: result.visual, wireColors, componentNotes: notes },
      extraSvg: (
        <g pointerEvents="none">
          {tags.map((t, i) => (
            <g key={i} transform={`translate(${t.x - 46} ${t.y - 9})`}>
              <rect width={40} height={14} rx={3} fill="rgba(8,15,30,0.85)" stroke="#38bdf8" strokeWidth={0.8} />
              <text x={20} y={10.5} fontSize={9} textAnchor="middle" fill="#7dd3fc" fontFamily="Inter, Arial" fontWeight={600}>
                {fmt(Math.abs(t.v) < 1e-3 ? 0 : t.v, 3)} V
              </text>
            </g>
          ))}
        </g>
      ),
      onComponentDown,
      onComponentUp,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, result, showVoltages, showCurrents, doc.elements]);

  const toolbarButtons = (
    <>
      <button className={`btn btn-sm ${active ? 'btn-primary' : ''}`} onClick={() => setActive((a) => !a)} title="Start eller stopp simuleringen">
        {active ? <Square size={15} /> : <Play size={15} />} <span>{active ? 'Stopp simulering' : 'Simuler'}</span>
      </button>
      {active && (
        <button className="btn btn-sm" onClick={reset} title="Tilbakestill brytere, sikringer og reléer">
          <RotateCcw size={15} /> <span className="hide-sm">Tilbakestill</span>
        </button>
      )}
    </>
  );

  const comps = doc.elements.filter((e): e is ComponentEl => e.type === 'component' && !!getSymbol(e.symbolId)?.sim);
  const panel = result ? (
    <aside className="editor-panel sim-panel" aria-label="Simuleringsresultat">
      <div className="panel-head">Simulering</div>
      <div className="panel-scroll">
        <div style={{ padding: 12 }}>
          <div className={`notice ${result.closedCircuit ? 'notice-ok' : 'notice-info'}`} style={{ marginBottom: 8 }}>
            {result.closedCircuit ? <CheckCircle2 size={18} color="var(--ok)" /> : <Info size={18} color="var(--accent-2)" />}
            <div>
              <b>{result.closedCircuit ? 'Lukket krets' : 'Åpen krets'}</b>
              <div className="small">Strøm fra kilde: {fmtI(result.sourceCurrent)}</div>
            </div>
          </div>
          <label className="checkbox small" style={{ marginBottom: 4 }}>
            <input type="checkbox" checked={showVoltages} onChange={(e) => setShowVoltages(e.target.checked)} /> Vis spenning i punktene (mot referanse 0 V)
          </label>
          <label className="checkbox small">
            <input type="checkbox" checked={showCurrents} onChange={(e) => setShowCurrents(e.target.checked)} /> Vis spenning og strøm ved komponentene
          </label>
          <div className="small muted" style={{ marginTop: 6 }}>
            Ledningsfarge: <span style={{ color: '#f97316' }}>oransje/rød</span> = spenning mot referansen, <span style={{ color: '#3b82f6' }}>blå</span> = 0 V.
          </div>
        </div>
        {result.messages
          .filter((m) => m.level !== 'ok' && m.level !== 'info' ? true : !m.text.startsWith('Lukket') && !m.text.startsWith('Åpen'))
          .map((m, i) => (
            <div key={i} className="sim-msg">
              {m.level === 'error' ? <XCircle size={16} color="var(--danger)" /> : m.level === 'warning' ? <AlertTriangle size={16} color="var(--warn)" /> : <Info size={16} color="var(--accent-2)" />}
              <span>{m.text}</span>
            </div>
          ))}
        {comps.length > 0 && (
          <div style={{ padding: 12 }}>
            <div className="prop-title">Verdier i modellen</div>
            <table className="table sim-table">
              <thead>
                <tr>
                  <th>Komp.</th>
                  <th>U</th>
                  <th>I</th>
                  <th>Tilstand</th>
                </tr>
              </thead>
              <tbody>
                {comps.map((c) => {
                  const role = getSymbol(c.symbolId)!.sim!;
                  if (role === 'ground' || role === 'conductor') return null;
                  const v = result.visual[c.id];
                  const state =
                    role === 'lamp' || role === 'led'
                      ? (v?.level ?? 0) > 0.02
                        ? `lyser ${Math.round((v?.level ?? 0) * 100)} %`
                        : 'mørk'
                      : role === 'motor'
                        ? (v?.level ?? 0) > 0
                          ? 'går'
                          : 'står'
                        : role === 'bell'
                          ? (v?.level ?? 0) > 0
                            ? 'ringer'
                            : 'stille'
                          : role === 'coil' || role === 'timer-on' || role === 'timer-off'
                            ? v?.energized
                              ? 'trukket'
                              : 'falt'
                            : role === 'changeover'
                              ? v?.closed
                                ? 'stilling 2'
                                : 'stilling 1'
                              : v?.blown
                                ? 'utløst'
                                : v?.closed !== undefined
                                  ? v.closed
                                    ? 'lukket'
                                    : 'åpen'
                                  : '';
                  return (
                    <tr key={c.id}>
                      <td className="mono">{c.label || getSymbol(c.symbolId)?.name}</td>
                      <td>{result.voltageAcross[c.id] !== undefined ? fmtV(Math.abs(result.voltageAcross[c.id])) : '–'}</td>
                      <td>{result.current[c.id] !== undefined ? fmtI(Math.abs(result.current[c.id])) : '–'}</td>
                      <td className="small">{state}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: 12 }}>
          <SafetyNotice variant="simulation" />
        </div>
      </div>
    </aside>
  ) : null;

  return { active, setActive, result, overlay, toolbarButtons, panel, reset };
}
