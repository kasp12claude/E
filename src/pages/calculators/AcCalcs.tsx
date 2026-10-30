import { useMemo, useState } from 'react';
import { Field, UnitInput } from '../../components/ui';
import { CalcCard, ResultView, SQRT2, Segmented, readCosPhi, readNum, runCalc, v, type CalcStep } from './common';

type PeakKnown = 'eff' | 'top' | 'pp';

export function PeakRmsCalc() {
  const [known, setKnown] = useState<PeakKnown>('eff');
  const [val, setVal] = useState('');
  const result = useMemo(
    () =>
      runCalc(() => {
        const x = readNum('Spenning', val, 'nonnegative');
        const steps: CalcStep[] = [];
        let eff: number, top: number, pp: number;
        if (known === 'eff') {
          eff = x;
          top = SQRT2 * eff;
          steps.push({ label: 'Toppverdi', formula: 'Û = √2 · U_eff', substituted: `Û = 1,414 · ${v(eff, 'V')}`, result: `Û = ${v(top, 'V')}` });
          pp = 2 * top;
          steps.push({ label: 'Topp-til-topp', formula: 'U_pp = 2 · Û', substituted: `U_pp = 2 · ${v(top, 'V')}`, result: `U_pp = ${v(pp, 'V')}` });
        } else if (known === 'top') {
          top = x;
          eff = top / SQRT2;
          steps.push({ label: 'Effektivverdi', formula: 'U_eff = Û / √2', substituted: `U_eff = ${v(top, 'V')} / 1,414`, result: `U_eff = ${v(eff, 'V')}` });
          pp = 2 * top;
          steps.push({ label: 'Topp-til-topp', formula: 'U_pp = 2 · Û', substituted: `U_pp = 2 · ${v(top, 'V')}`, result: `U_pp = ${v(pp, 'V')}` });
        } else {
          pp = x;
          top = pp / 2;
          steps.push({ label: 'Toppverdi', formula: 'Û = U_pp / 2', substituted: `Û = ${v(pp, 'V')} / 2`, result: `Û = ${v(top, 'V')}` });
          eff = top / SQRT2;
          steps.push({ label: 'Effektivverdi', formula: 'U_eff = Û / √2', substituted: `U_eff = ${v(top, 'V')} / 1,414`, result: `U_eff = ${v(eff, 'V')}` });
        }
        return {
          title: 'Topp- og effektivverdi (sinus)',
          steps,
          answer: [`U_eff = ${v(eff, 'V')}`, `Û = ${v(top, 'V')}`, `U_pp = ${v(pp, 'V')}`],
          notes: ['Effektivverdien er den likespenningen som ville gitt samme effekt i en resistiv last. Multimetre viser normalt effektivverdi.'],
        };
      }),
    [known, val],
  );
  return (
    <CalcCard
      title="Toppverdi og effektivverdi"
      level="skole"
      description="Sammenhengen mellom effektivverdi, toppverdi og topp-til-topp-verdi for en sinusformet vekselspenning."
      assumptions={['Ren sinusformet kurveform (gjelder ikke firkant, trekant eller forvrengte kurver)']}
      inputs={
        <>
          <Segmented
            label="Hvilken verdi kjenner du?"
            value={known}
            onChange={setKnown}
            options={[
              { id: 'eff', label: 'Effektivverdi' },
              { id: 'top', label: 'Toppverdi Û' },
              { id: 'pp', label: 'Topp-til-topp' },
            ]}
          />
          <Field label={known === 'eff' ? 'U_eff' : known === 'top' ? 'Û' : 'U_pp'}>
            <UnitInput value={val} onChange={setVal} unit="V" placeholder="f.eks. 230" />
          </Field>
        </>
      }
      result={<ResultView result={result} calcType="topp-effektiv" inputs={{ kjent: known, verdi: val }} />}
    />
  );
}

export function FrequencyCalc() {
  const [known, setKnown] = useState<'f' | 'T'>('f');
  const [val, setVal] = useState('');
  const result = useMemo(
    () =>
      runCalc(() => {
        const x = readNum(known === 'f' ? 'Frekvens f' : 'Periodetid T', val, 'divisor');
        const steps: CalcStep[] = [];
        let f: number, T: number;
        if (known === 'f') {
          f = x;
          T = 1 / f;
          steps.push({ label: 'Periodetid', formula: 'T = 1 / f', substituted: `T = 1 / ${v(f, 'Hz')}`, result: `T = ${v(T, 's')} = ${v(T * 1000, 'ms')}` });
        } else {
          T = x / 1000;
          f = 1 / T;
          steps.push({ label: 'Frekvens', formula: 'f = 1 / T', substituted: `f = 1 / ${v(T, 's')}`, result: `f = ${v(f, 'Hz')}` });
        }
        const w = 2 * Math.PI * f;
        steps.push({ label: 'Vinkelfrekvens', formula: 'ω = 2 · π · f', substituted: `ω = 2 · 3,1416 · ${v(f, 'Hz')}`, result: `ω = ${v(w, 'rad/s')}` });
        return {
          title: 'Frekvens og periodetid',
          steps,
          answer: [`f = ${v(f, 'Hz')}`, `T = ${v(T * 1000, 'ms')}`, `ω = ${v(w, 'rad/s')}`],
        };
      }),
    [known, val],
  );
  return (
    <CalcCard
      title="Frekvens og periodetid"
      level="skole"
      description="Frekvensen er antall perioder per sekund. Periodetiden er tiden én periode varer."
      inputs={
        <>
          <Segmented
            label="Hva kjenner du?"
            value={known}
            onChange={setKnown}
            options={[
              { id: 'f', label: 'Frekvens f' },
              { id: 'T', label: 'Periodetid T' },
            ]}
          />
          <Field label={known === 'f' ? 'Frekvens f' : 'Periodetid T'}>
            <UnitInput value={val} onChange={setVal} unit={known === 'f' ? 'Hz' : 'ms'} placeholder={known === 'f' ? 'f.eks. 50' : 'f.eks. 20'} />
          </Field>
        </>
      }
      result={<ResultView result={result} calcType="frekvens" inputs={{ kjent: known, verdi: val }} />}
    />
  );
}

export function AcPowerCalc() {
  const [mode, setMode] = useState<'fraUI' | 'finnI'>('fraUI');
  const [U, setU] = useState('');
  const [I, setI] = useState('');
  const [P, setP] = useState('');
  const [cos, setCos] = useState('');
  const result = useMemo(
    () =>
      runCalc(() => {
        const steps: CalcStep[] = [];
        const u = readNum('Spenning U', U, 'divisor');
        const c = readCosPhi(cos);
        let i: number;
        if (mode === 'finnI') {
          const p = readNum('Aktiv effekt P', P, 'nonnegative');
          i = p / (u * c);
          steps.push({ label: 'Strøm', formula: 'I = P / (U · cos φ)', substituted: `I = ${v(p, 'W')} / (${v(u, 'V')} · ${v(c)})`, result: `I = ${v(i, 'A')}` });
        } else {
          i = readNum('Strøm I', I, 'divisor');
        }
        const z = u / i;
        steps.push({ label: 'Impedans', formula: 'Z = U / I', substituted: `Z = ${v(u, 'V')} / ${v(i, 'A')}`, result: `Z = ${v(z, 'Ω')}` });
        const s = u * i;
        steps.push({ label: 'Tilsynelatende effekt', formula: 'S = U · I', substituted: `S = ${v(u, 'V')} · ${v(i, 'A')}`, result: `S = ${v(s, 'VA')}` });
        const p = s * c;
        if (mode === 'fraUI')
          steps.push({ label: 'Aktiv effekt', formula: 'P = U · I · cos φ', substituted: `P = ${v(u, 'V')} · ${v(i, 'A')} · ${v(c)}`, result: `P = ${v(p, 'W')}` });
        const phi = Math.acos(c);
        const sin = Math.sin(phi);
        steps.push({ label: 'Fasevinkel', formula: 'φ = arccos(cos φ),  sin φ = √(1 − cos² φ)', substituted: `φ = arccos(${v(c)})`, result: `φ = ${v((phi * 180) / Math.PI, '°')},  sin φ = ${v(sin)}` });
        const q = s * sin;
        steps.push({ label: 'Reaktiv effekt', formula: 'Q = U · I · sin φ', substituted: `Q = ${v(u, 'V')} · ${v(i, 'A')} · ${v(sin)}`, result: `Q = ${v(q, 'var')}` });
        return {
          title: 'Effekt og impedans i enfase vekselstrøm',
          steps,
          answer: [`I = ${v(i, 'A')}`, `Z = ${v(z, 'Ω')}`, `S = ${v(s, 'VA')}`, `P = ${v(p, 'W')}`, `Q = ${v(q, 'var')}`],
          notes: [
            `Effekttrekanten: S² = P² + Q² → ${v(s * s)} ≈ ${v(p * p + q * q)}.`,
            'cos φ = 1 betyr ren resistiv last. Ved induktiv last (f.eks. motor) ligger strømmen etter spenningen.',
          ],
        };
      }),
    [mode, U, I, P, cos],
  );
  return (
    <CalcCard
      title="Impedans og effekt (enfase AC)"
      level="forutsetninger"
      description="Beregn impedans, tilsynelatende, aktiv og reaktiv effekt for en enfase vekselstrømslast."
      assumptions={[
        'Sinusformet spenning og strøm',
        'U og I er effektivverdier',
        'Effektfaktoren cos φ er kjent (målt eller oppgitt av produsent)',
        'Lineær last uten overharmoniske',
      ]}
      inputs={
        <>
          <Segmented
            label="Hva kjenner du?"
            value={mode}
            onChange={setMode}
            options={[
              { id: 'fraUI', label: 'U, I og cos φ' },
              { id: 'finnI', label: 'P, U og cos φ' },
            ]}
          />
          <Field label="Spenning U">
            <UnitInput value={U} onChange={setU} unit="V" placeholder="f.eks. 230" />
          </Field>
          {mode === 'fraUI' ? (
            <Field label="Strøm I">
              <UnitInput value={I} onChange={setI} unit="A" placeholder="f.eks. 4" />
            </Field>
          ) : (
            <Field label="Aktiv effekt P">
              <UnitInput value={P} onChange={setP} unit="W" placeholder="f.eks. 800" />
            </Field>
          )}
          <Field label="Effektfaktor cos φ" hint="Mellom 0 og 1">
            <UnitInput value={cos} onChange={setCos} placeholder="f.eks. 0,85" />
          </Field>
        </>
      }
      result={<ResultView result={result} calcType="ac-effekt" inputs={{ kjent: mode, U, I, P, cosphi: cos }} />}
    />
  );
}
