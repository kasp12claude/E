import { useMemo, useState } from 'react';
import { Field, UnitInput } from '../../components/ui';
import { CalcCard, CalcError, ResultView, Segmented, readNum, runCalc, v, type CalcStep } from './common';

class CalcError0 extends CalcError {
  constructor(label: string) {
    super(`«${label}» er null, så de andre størrelsene kan ikke beregnes (deling på null).`);
  }
}

type OhmUnknown = 'U' | 'I' | 'R';

export function OhmCalc() {
  const [unknown, setUnknown] = useState<OhmUnknown>('I');
  const [U, setU] = useState('');
  const [I, setI] = useState('');
  const [R, setR] = useState('');

  const result = useMemo(
    () =>
      runCalc(() => {
        if (unknown === 'U') {
          const r = readNum('Resistans R', R, 'nonnegative');
          const i = readNum('Strøm I', I, 'nonnegative');
          const u = r * i;
          return {
            title: 'Ohms lov – spenning',
            steps: [{ formula: 'U = R · I', substituted: `U = ${v(r, 'Ω')} · ${v(i, 'A')}`, result: `U = ${v(u, 'V')}` }],
            answer: [`U = ${v(u, 'V')}`],
          };
        }
        if (unknown === 'I') {
          const u = readNum('Spenning U', U, 'nonnegative');
          const r = readNum('Resistans R', R, 'divisor');
          const i = u / r;
          return {
            title: 'Ohms lov – strøm',
            steps: [{ formula: 'I = U / R', substituted: `I = ${v(u, 'V')} / ${v(r, 'Ω')}`, result: `I = ${v(i, 'A')}` }],
            answer: [`I = ${v(i, 'A')}`, `I = ${v(i * 1000, 'mA')}`],
          };
        }
        const u = readNum('Spenning U', U, 'nonnegative');
        const i = readNum('Strøm I', I, 'divisor');
        const r = u / i;
        return {
          title: 'Ohms lov – resistans',
          steps: [{ formula: 'R = U / I', substituted: `R = ${v(u, 'V')} / ${v(i, 'A')}`, result: `R = ${v(r, 'Ω')}` }],
          answer: [`R = ${v(r, 'Ω')}`],
        };
      }),
    [unknown, U, I, R],
  );

  return (
    <CalcCard
      title="Ohms lov"
      level="skole"
      description="Sammenhengen mellom spenning, strøm og resistans i en resistiv krets: U = R · I."
      assumptions={['Resistansen er konstant (lineær last)']}
      inputs={
        <>
          <Segmented
            label="Hva skal beregnes?"
            value={unknown}
            onChange={setUnknown}
            options={[
              { id: 'U', label: 'Spenning U' },
              { id: 'I', label: 'Strøm I' },
              { id: 'R', label: 'Resistans R' },
            ]}
          />
          {unknown !== 'U' && (
            <Field label="Spenning U">
              <UnitInput value={U} onChange={setU} unit="V" placeholder="f.eks. 12" />
            </Field>
          )}
          {unknown !== 'I' && (
            <Field label="Strøm I">
              <UnitInput value={I} onChange={setI} unit="A" placeholder="f.eks. 0,5" />
            </Field>
          )}
          {unknown !== 'R' && (
            <Field label="Resistans R">
              <UnitInput value={R} onChange={setR} unit="Ω" placeholder="f.eks. 24" />
            </Field>
          )}
        </>
      }
      result={<ResultView result={result} calcType="ohm" inputs={{ beregner: unknown, U, I, R }} />}
    />
  );
}

type PowerKnown = 'UI' | 'UR' | 'IR' | 'PU' | 'PI' | 'PR';

const POWER_OPTIONS: { id: PowerKnown; label: string }[] = [
  { id: 'UI', label: 'U og I' },
  { id: 'UR', label: 'U og R' },
  { id: 'IR', label: 'I og R' },
  { id: 'PU', label: 'P og U' },
  { id: 'PI', label: 'P og I' },
  { id: 'PR', label: 'P og R' },
];

export function PowerCalc() {
  const [known, setKnown] = useState<PowerKnown>('UI');
  const [P, setP] = useState('');
  const [U, setU] = useState('');
  const [I, setI] = useState('');
  const [R, setR] = useState('');

  const result = useMemo(
    () =>
      runCalc(() => {
        const steps: CalcStep[] = [];
        let p = 0,
          u = 0,
          i = 0,
          r = 0;
        switch (known) {
          case 'UI':
            u = readNum('Spenning U', U, 'nonnegative');
            i = readNum('Strøm I', I, 'nonnegative');
            p = u * i;
            steps.push({ label: 'Effekt', formula: 'P = U · I', substituted: `P = ${v(u, 'V')} · ${v(i, 'A')}`, result: `P = ${v(p, 'W')}` });
            if (i === 0) throw new CalcError0('Strøm I');
            r = u / i;
            steps.push({ label: 'Resistans', formula: 'R = U / I', substituted: `R = ${v(u, 'V')} / ${v(i, 'A')}`, result: `R = ${v(r, 'Ω')}` });
            break;
          case 'UR':
            u = readNum('Spenning U', U, 'nonnegative');
            r = readNum('Resistans R', R, 'divisor');
            p = (u * u) / r;
            steps.push({ label: 'Effekt', formula: 'P = U² / R', substituted: `P = (${v(u, 'V')})² / ${v(r, 'Ω')}`, result: `P = ${v(p, 'W')}` });
            i = u / r;
            steps.push({ label: 'Strøm', formula: 'I = U / R', substituted: `I = ${v(u, 'V')} / ${v(r, 'Ω')}`, result: `I = ${v(i, 'A')}` });
            break;
          case 'IR':
            i = readNum('Strøm I', I, 'nonnegative');
            r = readNum('Resistans R', R, 'nonnegative');
            p = i * i * r;
            steps.push({ label: 'Effekt', formula: 'P = I² · R', substituted: `P = (${v(i, 'A')})² · ${v(r, 'Ω')}`, result: `P = ${v(p, 'W')}` });
            u = r * i;
            steps.push({ label: 'Spenning', formula: 'U = R · I', substituted: `U = ${v(r, 'Ω')} · ${v(i, 'A')}`, result: `U = ${v(u, 'V')}` });
            break;
          case 'PU':
            p = readNum('Effekt P', P, 'nonnegative');
            u = readNum('Spenning U', U, 'divisor');
            i = p / u;
            steps.push({ label: 'Strøm', formula: 'I = P / U', substituted: `I = ${v(p, 'W')} / ${v(u, 'V')}`, result: `I = ${v(i, 'A')}` });
            if (p === 0) throw new CalcError0('Effekt P');
            r = (u * u) / p;
            steps.push({ label: 'Resistans', formula: 'R = U² / P', substituted: `R = (${v(u, 'V')})² / ${v(p, 'W')}`, result: `R = ${v(r, 'Ω')}` });
            break;
          case 'PI':
            p = readNum('Effekt P', P, 'nonnegative');
            i = readNum('Strøm I', I, 'divisor');
            u = p / i;
            steps.push({ label: 'Spenning', formula: 'U = P / I', substituted: `U = ${v(p, 'W')} / ${v(i, 'A')}`, result: `U = ${v(u, 'V')}` });
            r = p / (i * i);
            steps.push({ label: 'Resistans', formula: 'R = P / I²', substituted: `R = ${v(p, 'W')} / (${v(i, 'A')})²`, result: `R = ${v(r, 'Ω')}` });
            break;
          case 'PR':
            p = readNum('Effekt P', P, 'nonnegative');
            r = readNum('Resistans R', R, 'divisor');
            u = Math.sqrt(p * r);
            steps.push({ label: 'Spenning', formula: 'U = √(P · R)', substituted: `U = √(${v(p, 'W')} · ${v(r, 'Ω')})`, result: `U = ${v(u, 'V')}` });
            i = Math.sqrt(p / r);
            steps.push({ label: 'Strøm', formula: 'I = √(P / R)', substituted: `I = √(${v(p, 'W')} / ${v(r, 'Ω')})`, result: `I = ${v(i, 'A')}` });
            break;
        }
        return {
          title: `Effektberegning (kjent: ${POWER_OPTIONS.find((o) => o.id === known)!.label})`,
          steps,
          answer: [`P = ${v(p, 'W')}`, `U = ${v(u, 'V')}`, `I = ${v(i, 'A')}`, `R = ${v(r, 'Ω')}`],
          notes: ['Effektformlene for likestrøm gjelder også for rent resistive laster i vekselstrøm når U og I er effektivverdier.'],
        };
      }),
    [known, P, U, I, R],
  );

  const show = (k: string) => known.includes(k);
  return (
    <CalcCard
      title="Effekt"
      level="skole"
      description="Elektrisk effekt i en resistiv likestrømskrets. Velg hvilke to størrelser du kjenner – de andre beregnes."
      assumptions={['Resistiv last (ingen faseforskyvning)']}
      inputs={
        <>
          <Segmented label="Hvilke størrelser kjenner du?" value={known} onChange={setKnown} options={POWER_OPTIONS} />
          {show('P') && (
            <Field label="Effekt P">
              <UnitInput value={P} onChange={setP} unit="W" placeholder="f.eks. 60" />
            </Field>
          )}
          {show('U') && (
            <Field label="Spenning U">
              <UnitInput value={U} onChange={setU} unit="V" placeholder="f.eks. 230" />
            </Field>
          )}
          {show('I') && (
            <Field label="Strøm I">
              <UnitInput value={I} onChange={setI} unit="A" placeholder="f.eks. 2" />
            </Field>
          )}
          {show('R') && (
            <Field label="Resistans R">
              <UnitInput value={R} onChange={setR} unit="Ω" placeholder="f.eks. 100" />
            </Field>
          )}
        </>
      }
      result={<ResultView result={result} calcType="effekt" inputs={{ kjent: known, P, U, I, R }} />}
    />
  );
}
