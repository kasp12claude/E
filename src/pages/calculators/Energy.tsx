import { useMemo, useState } from 'react';
import { Field, UnitInput } from '../../components/ui';
import { CalcCard, ResultView, Segmented, readNum, readOptional, runCalc, v, type CalcStep } from './common';

type Unknown = 'W' | 'P' | 't';
type TimeUnit = 's' | 'min' | 'h';
const TO_HOURS: Record<TimeUnit, number> = { s: 1 / 3600, min: 1 / 60, h: 1 };
const TIME_LABEL: Record<TimeUnit, string> = { s: 'sekunder', min: 'minutter', h: 'timer' };

export function EnergyCalc() {
  const [unknown, setUnknown] = useState<Unknown>('W');
  const [P, setP] = useState('');
  const [t, setT] = useState('');
  const [tUnit, setTUnit] = useState<TimeUnit>('h');
  const [W, setW] = useState('');
  const [price, setPrice] = useState('');

  const result = useMemo(
    () =>
      runCalc(() => {
        const steps: CalcStep[] = [];
        const answer: string[] = [];
        let kwh: number;
        const readTimeHours = () => {
          const tv = readNum('Tid t', t, unknown === 'P' ? 'divisor' : 'nonnegative');
          if (tUnit === 'h') return tv;
          const th = tv * TO_HOURS[tUnit];
          steps.push({
            label: 'Gjør om tiden til timer',
            formula: tUnit === 's' ? 't [h] = t [s] / 3600' : 't [h] = t [min] / 60',
            substituted: `t = ${v(tv, tUnit)} / ${tUnit === 's' ? '3600' : '60'}`,
            result: `t = ${v(th, 'h')}`,
          });
          return th;
        };

        if (unknown === 'W') {
          const p = readNum('Effekt P', P, 'nonnegative');
          const th = readTimeHours();
          const wh = p * th;
          kwh = wh / 1000;
          steps.push({ label: 'Energi', formula: 'W = P · t', substituted: `W = ${v(p, 'W')} · ${v(th, 'h')}`, result: `W = ${v(wh, 'Wh')}` });
          steps.push({ label: 'Gjør om til kWh', formula: 'W [kWh] = W [Wh] / 1000', substituted: `W = ${v(wh, 'Wh')} / 1000`, result: `W = ${v(kwh, 'kWh')}` });
          answer.push(`W = ${v(kwh, 'kWh')}`, `W = ${v(wh, 'Wh')}`, `W = ${v(wh * 3600, 'J')}`);
        } else if (unknown === 'P') {
          kwh = readNum('Energi W', W, 'nonnegative');
          const th = readTimeHours();
          const wh = kwh * 1000;
          const p = wh / th;
          steps.push({ label: 'Gjør om til Wh', formula: 'W [Wh] = W [kWh] · 1000', substituted: `W = ${v(kwh, 'kWh')} · 1000`, result: `W = ${v(wh, 'Wh')}` });
          steps.push({ label: 'Effekt', formula: 'P = W / t', substituted: `P = ${v(wh, 'Wh')} / ${v(th, 'h')}`, result: `P = ${v(p, 'W')}` });
          answer.push(`P = ${v(p, 'W')}`, `P = ${v(p / 1000, 'kW')}`);
        } else {
          kwh = readNum('Energi W', W, 'nonnegative');
          const p = readNum('Effekt P', P, 'divisor');
          const wh = kwh * 1000;
          const th = wh / p;
          steps.push({ label: 'Gjør om til Wh', formula: 'W [Wh] = W [kWh] · 1000', substituted: `W = ${v(kwh, 'kWh')} · 1000`, result: `W = ${v(wh, 'Wh')}` });
          steps.push({ label: 'Tid', formula: 't = W / P', substituted: `t = ${v(wh, 'Wh')} / ${v(p, 'W')}`, result: `t = ${v(th, 'h')}` });
          answer.push(`t = ${v(th, 'h')}`, `t = ${v(th * 60, 'min')}`);
        }

        const pr = readOptional('Strømpris', price, 'nonnegative');
        if (pr !== undefined) {
          const cost = kwh * pr;
          steps.push({ label: 'Kostnad', formula: 'Kostnad = W [kWh] · pris', substituted: `Kostnad = ${v(kwh, 'kWh')} · ${v(pr, 'kr/kWh')}`, result: `Kostnad = ${v(cost, 'kr')}` });
          answer.push(`Kostnad = ${v(cost, 'kr')}`);
        }
        return {
          title: unknown === 'W' ? 'Elektrisk energi' : unknown === 'P' ? 'Effekt fra energi og tid' : 'Brukstid fra energi og effekt',
          steps,
          answer,
          notes: ['1 kWh = 1000 Wh = 3 600 000 J.', 'Strømprisen er det du selv skriver inn; nettleie og avgifter er ikke tatt med med mindre de inngår i prisen.'],
        };
      }),
    [unknown, P, t, tUnit, W, price],
  );

  return (
    <CalcCard
      title="Elektrisk energi"
      level="skole"
      description="Energi er effekt ganget med tid: W = P · t. Beregn energi, effekt eller tid, og eventuelt hva energien koster."
      assumptions={['Effekten er konstant i hele perioden']}
      inputs={
        <>
          <Segmented
            label="Hva skal beregnes?"
            value={unknown}
            onChange={setUnknown}
            options={[
              { id: 'W', label: 'Energi W' },
              { id: 'P', label: 'Effekt P' },
              { id: 't', label: 'Tid t' },
            ]}
          />
          {unknown !== 'P' && (
            <Field label="Effekt P">
              <UnitInput value={P} onChange={setP} unit="W" placeholder="f.eks. 2000" />
            </Field>
          )}
          {unknown !== 'W' && (
            <Field label="Energi W">
              <UnitInput value={W} onChange={setW} unit="kWh" placeholder="f.eks. 3,5" />
            </Field>
          )}
          {unknown !== 't' && (
            <Field label="Tid t">
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <input className="input" value={t} onChange={(e) => setT(e.target.value)} inputMode="decimal" placeholder="f.eks. 1,5" aria-label="Tid" />
                <select className="select" style={{ width: 130 }} value={tUnit} onChange={(e) => setTUnit(e.target.value as TimeUnit)} aria-label="Tidsenhet">
                  {(Object.keys(TIME_LABEL) as TimeUnit[]).map((u) => (
                    <option key={u} value={u}>
                      {TIME_LABEL[u]}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
          )}
          <Field label="Strømpris (valgfri)">
            <UnitInput value={price} onChange={setPrice} unit="kr/kWh" placeholder="f.eks. 1,20" />
          </Field>
        </>
      }
      result={<ResultView result={result} calcType="energi" inputs={{ beregner: unknown, P, W, t, tidsenhet: tUnit, pris: price }} />}
    />
  );
}
