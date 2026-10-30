import { useMemo, useState } from 'react';
import { Field } from '../../components/ui';
import { fmt } from '../../utils/id';
import { CalcCard, ResultView, readNum, runCalc, v } from './common';

type Quantity = 'V' | 'A' | 'Ω' | 'W' | 'energi';

const QUANTITIES: { id: Quantity; label: string }[] = [
  { id: 'V', label: 'Spenning (V)' },
  { id: 'A', label: 'Strøm (A)' },
  { id: 'Ω', label: 'Resistans (Ω)' },
  { id: 'W', label: 'Effekt (W)' },
  { id: 'energi', label: 'Energi (J, Wh, kWh)' },
];

const PREFIXES: { p: string; f: number; name: string }[] = [
  { p: 'µ', f: 1e-6, name: 'mikro' },
  { p: 'm', f: 1e-3, name: 'milli' },
  { p: '', f: 1, name: '' },
  { p: 'k', f: 1e3, name: 'kilo' },
  { p: 'M', f: 1e6, name: 'mega' },
];

const ENERGY: { u: string; f: number }[] = [
  { u: 'J', f: 1 },
  { u: 'kJ', f: 1e3 },
  { u: 'MJ', f: 1e6 },
  { u: 'Wh', f: 3600 },
  { u: 'kWh', f: 3.6e6 },
  { u: 'MWh', f: 3.6e9 },
];

function unitsFor(q: Quantity): { u: string; f: number; desc: string }[] {
  if (q === 'energi') return ENERGY.map((e) => ({ ...e, desc: e.u }));
  return PREFIXES.map((p) => ({ u: `${p.p}${q}`, f: p.f, desc: p.name ? `${p.p}${q} (${p.name})` : q }));
}

function factorText(f: number) {
  if (f === 1) return '1';
  const exp = Math.log10(f);
  if (Math.abs(exp - Math.round(exp)) < 1e-9) return `10^${Math.round(exp)}`;
  return fmt(f, 6);
}

export function UnitsCalc() {
  const [q, setQ] = useState<Quantity>('V');
  const [value, setValue] = useState('');
  const [from, setFrom] = useState('kV');
  const [to, setTo] = useState('V');
  const units = unitsFor(q);

  const changeQuantity = (nq: Quantity) => {
    setQ(nq);
    const us = unitsFor(nq);
    if (nq === 'energi') {
      setFrom('kWh');
      setTo('J');
    } else {
      setFrom(us[3].u);
      setTo(us[2].u);
    }
  };

  const result = useMemo(
    () =>
      runCalc(() => {
        const x = readNum('Verdi', value, 'any');
        const uf = units.find((u) => u.u === from)!;
        const ut = units.find((u) => u.u === to)!;
        const ratio = uf.f / ut.f;
        const y = x * ratio;
        const all = units.map((u) => `${fmt((x * uf.f) / u.f, 6)} ${u.u}`);
        return {
          title: `Enhetskonvertering ${from} → ${to}`,
          steps: [
            {
              label: 'Omregningsfaktor',
              formula: `faktor = (1 ${from} i grunnenhet) / (1 ${to} i grunnenhet)`,
              substituted: `faktor = ${factorText(uf.f)} / ${factorText(ut.f)}`,
              result: `faktor = ${factorText(ratio)}`,
            },
            {
              label: 'Ny verdi',
              formula: 'ny verdi = verdi · faktor',
              substituted: `ny verdi = ${fmt(x, 6)} · ${factorText(ratio)}`,
              result: `${fmt(x, 6)} ${from} = ${fmt(y, 6)} ${to}`,
            },
          ],
          answer: [`${v(y, to)}`],
          notes: [`Samme verdi i alle enheter: ${all.join(' = ')}`, ...(q === 'energi' ? ['1 Wh = 3600 J fordi 1 W = 1 J/s og 1 h = 3600 s.'] : [])],
        };
      }),
    [value, from, to, units, q],
  );

  return (
    <CalcCard
      title="Enhetskonvertering"
      level="skole"
      description="Gjør om mellom prefikser (µ, m, k, M) og mellom energienheter (J, Wh, kWh)."
      inputs={
        <>
          <Field label="Størrelse">
            <select className="select" value={q} onChange={(e) => changeQuantity(e.target.value as Quantity)}>
              {QUANTITIES.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Verdi">
            <input className="input" value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder="f.eks. 0,4" />
          </Field>
          <div className="grid grid-2" style={{ gap: 8 }}>
            <Field label="Fra">
              <select className="select" value={from} onChange={(e) => setFrom(e.target.value)}>
                {units.map((u) => (
                  <option key={u.u} value={u.u}>
                    {u.desc}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Til">
              <select className="select" value={to} onChange={(e) => setTo(e.target.value)}>
                {units.map((u) => (
                  <option key={u.u} value={u.u}>
                    {u.desc}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
          >
            Bytt retning
          </button>
        </>
      }
      result={<ResultView result={result} calcType="enheter" inputs={{ storrelse: q, verdi: value, fra: from, til: to }} />}
    />
  );
}
