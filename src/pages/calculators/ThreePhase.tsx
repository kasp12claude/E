import { useMemo, useState } from 'react';
import { Field, Notice, UnitInput } from '../../components/ui';
import { CalcCard, ResultView, SQRT3, Segmented, readCosPhi, readNum, readOptional, runCalc, v, type CalcStep } from './common';

export function ThreePhasePowerCalc() {
  const [unknown, setUnknown] = useState<'P' | 'I'>('P');
  const [U, setU] = useState('');
  const [I, setI] = useState('');
  const [P, setP] = useState('');
  const [cos, setCos] = useState('');
  const result = useMemo(
    () =>
      runCalc(() => {
        const steps: CalcStep[] = [];
        const u = readNum('Linjespenning U', U, 'divisor');
        const c = readCosPhi(cos);
        let i: number, p: number;
        if (unknown === 'P') {
          i = readNum('Linjestrøm I', I, 'nonnegative');
          p = SQRT3 * u * i * c;
          steps.push({ label: 'Aktiv effekt', formula: 'P = √3 · U · I · cos φ', substituted: `P = 1,732 · ${v(u, 'V')} · ${v(i, 'A')} · ${v(c)}`, result: `P = ${v(p, 'W')} = ${v(p / 1000, 'kW')}` });
        } else {
          p = readNum('Aktiv effekt P', P, 'nonnegative');
          i = p / (SQRT3 * u * c);
          steps.push({ label: 'Linjestrøm', formula: 'I = P / (√3 · U · cos φ)', substituted: `I = ${v(p, 'W')} / (1,732 · ${v(u, 'V')} · ${v(c)})`, result: `I = ${v(i, 'A')}` });
        }
        const s = SQRT3 * u * i;
        steps.push({ label: 'Tilsynelatende effekt', formula: 'S = √3 · U · I', substituted: `S = 1,732 · ${v(u, 'V')} · ${v(i, 'A')}`, result: `S = ${v(s, 'VA')}` });
        const sin = Math.sqrt(Math.max(0, 1 - c * c));
        const q = s * sin;
        steps.push({ label: 'Reaktiv effekt', formula: 'Q = √3 · U · I · sin φ', substituted: `Q = 1,732 · ${v(u, 'V')} · ${v(i, 'A')} · ${v(sin)}`, result: `Q = ${v(q, 'var')}` });
        return {
          title: 'Trefase effekt (læringsverktøy)',
          steps,
          answer: [`P = ${v(p, 'W')}`, `I = ${v(i, 'A')}`, `S = ${v(s, 'VA')}`, `Q = ${v(q, 'var')}`],
          notes: ['Formlene gjelder både stjerne- og trekantkobling når U er linjespenning og I er linjestrøm.'],
        };
      }),
    [unknown, U, I, P, cos],
  );
  return (
    <CalcCard
      title="Trefase effekt"
      level="forutsetninger"
      description="Læringsverktøy for effekt i et symmetrisk trefasesystem."
      assumptions={[
        'Symmetrisk (lik) belastning på alle tre faser',
        'Sinusformet spenning og strøm',
        'U er linjespenning (mellom to faser), I er linjestrøm',
        'Effektfaktoren cos φ er kjent',
      ]}
      inputs={
        <>
          <Segmented
            label="Hva skal beregnes?"
            value={unknown}
            onChange={setUnknown}
            options={[
              { id: 'P', label: 'Effekt P' },
              { id: 'I', label: 'Strøm I' },
            ]}
          />
          <Field label="Linjespenning U">
            <UnitInput value={U} onChange={setU} unit="V" placeholder="f.eks. 400" />
          </Field>
          {unknown === 'P' ? (
            <Field label="Linjestrøm I">
              <UnitInput value={I} onChange={setI} unit="A" placeholder="f.eks. 10" />
            </Field>
          ) : (
            <Field label="Aktiv effekt P">
              <UnitInput value={P} onChange={setP} unit="W" placeholder="f.eks. 5500" />
            </Field>
          )}
          <Field label="Effektfaktor cos φ" hint="Mellom 0 og 1">
            <UnitInput value={cos} onChange={setCos} placeholder="f.eks. 0,85" />
          </Field>
        </>
      }
      result={<ResultView result={result} calcType="trefase-effekt" inputs={{ beregner: unknown, U, I, P, cosphi: cos }} />}
    />
  );
}

export function StarDeltaCalc() {
  const [conn, setConn] = useState<'stjerne' | 'trekant'>('stjerne');
  const [known, setKnown] = useState<'fase' | 'linje'>('linje');
  const [U, setU] = useState('');
  const [I, setI] = useState('');
  const result = useMemo(
    () =>
      runCalc(() => {
        const u = readNum(known === 'fase' ? 'Fasespenning' : 'Linjespenning', U, 'nonnegative');
        const i = readNum(known === 'fase' ? 'Fasestrøm' : 'Linjestrøm', I, 'nonnegative');
        const steps: CalcStep[] = [];
        let uf: number, ul: number, iF: number, il: number;
        if (conn === 'stjerne') {
          if (known === 'fase') {
            uf = u;
            iF = i;
            ul = SQRT3 * uf;
            il = iF;
            steps.push({ label: 'Linjespenning', formula: 'U_linje = √3 · U_fase', substituted: `U_linje = 1,732 · ${v(uf, 'V')}`, result: `U_linje = ${v(ul, 'V')}` });
          } else {
            ul = u;
            il = i;
            uf = ul / SQRT3;
            iF = il;
            steps.push({ label: 'Fasespenning', formula: 'U_fase = U_linje / √3', substituted: `U_fase = ${v(ul, 'V')} / 1,732`, result: `U_fase = ${v(uf, 'V')}` });
          }
          steps.push({ label: 'Strøm', formula: 'I_linje = I_fase (stjernekobling)', substituted: `I = ${v(il, 'A')}`, result: `I_linje = I_fase = ${v(il, 'A')}` });
        } else {
          if (known === 'fase') {
            uf = u;
            iF = i;
            ul = uf;
            il = SQRT3 * iF;
            steps.push({ label: 'Linjestrøm', formula: 'I_linje = √3 · I_fase', substituted: `I_linje = 1,732 · ${v(iF, 'A')}`, result: `I_linje = ${v(il, 'A')}` });
          } else {
            ul = u;
            il = i;
            uf = ul;
            iF = il / SQRT3;
            steps.push({ label: 'Fasestrøm', formula: 'I_fase = I_linje / √3', substituted: `I_fase = ${v(il, 'A')} / 1,732`, result: `I_fase = ${v(iF, 'A')}` });
          }
          steps.push({ label: 'Spenning', formula: 'U_linje = U_fase (trekantkobling)', substituted: `U = ${v(ul, 'V')}`, result: `U_linje = U_fase = ${v(ul, 'V')}` });
        }
        return {
          title: `${conn === 'stjerne' ? 'Stjernekobling' : 'Trekantkobling'} – fase- og linjestørrelser`,
          steps,
          answer: [`U_linje = ${v(ul, 'V')}`, `U_fase = ${v(uf, 'V')}`, `I_linje = ${v(il, 'A')}`, `I_fase = ${v(iF, 'A')}`],
          notes: ['Fasestørrelser gjelder over/gjennom én last (én vikling). Linjestørrelser gjelder i tilførselslederne.'],
        };
      }),
    [conn, known, U, I],
  );
  return (
    <CalcCard
      title="Stjerne- og trekantkobling"
      level="forutsetninger"
      description="Sammenhengen mellom fase- og linjestørrelser i stjerne- og trekantkobling."
      assumptions={['Symmetrisk belastning', 'Sinusformede størrelser (effektivverdier)']}
      inputs={
        <>
          <Segmented
            label="Kobling"
            value={conn}
            onChange={setConn}
            options={[
              { id: 'stjerne', label: 'Stjerne (Y)' },
              { id: 'trekant', label: 'Trekant (Δ)' },
            ]}
          />
          <Segmented
            label="Kjente verdier er"
            value={known}
            onChange={setKnown}
            options={[
              { id: 'linje', label: 'Linjestørrelser' },
              { id: 'fase', label: 'Fasestørrelser' },
            ]}
          />
          <Field label={known === 'fase' ? 'Fasespenning U_fase' : 'Linjespenning U_linje'}>
            <UnitInput value={U} onChange={setU} unit="V" placeholder={known === 'fase' ? 'f.eks. 230' : 'f.eks. 400'} />
          </Field>
          <Field label={known === 'fase' ? 'Fasestrøm I_fase' : 'Linjestrøm I_linje'}>
            <UnitInput value={I} onChange={setI} unit="A" placeholder="f.eks. 5" />
          </Field>
        </>
      }
      result={<ResultView result={result} calcType="stjerne-trekant" inputs={{ kobling: conn, kjent: known, U, I }} />}
    />
  );
}

export function VoltageDropCalc() {
  const [I, setI] = useState('');
  const [L, setL] = useState('');
  const [A, setA] = useState('');
  const [rho, setRho] = useState('0,0175');
  const [U, setU] = useState('');
  const result = useMemo(
    () =>
      runCalc(() => {
        const i = readNum('Strøm I', I, 'nonnegative');
        const l = readNum('Lengde L', L, 'nonnegative');
        const a = readNum('Tverrsnitt A', A, 'divisor');
        const r = readNum('Resistivitet ρ', rho, 'positive');
        const un = readOptional('Spenning U', U, 'divisor');
        const steps: CalcStep[] = [];
        const rl = (2 * l * r) / a;
        steps.push({
          label: 'Resistans i ledningssløyfen',
          formula: 'R_L = 2 · L · ρ / A',
          substituted: `R_L = 2 · ${v(l, 'm')} · ${v(r, 'Ω·mm²/m')} / ${v(a, 'mm²')}`,
          result: `R_L = ${v(rl, 'Ω')}`,
        });
        const du = i * rl;
        steps.push({ label: 'Spenningsfall', formula: 'ΔU = I · R_L = 2 · I · L · ρ / A', substituted: `ΔU = ${v(i, 'A')} · ${v(rl, 'Ω')}`, result: `ΔU = ${v(du, 'V')}` });
        const answer = [`ΔU = ${v(du, 'V')}`];
        if (un !== undefined) {
          const pct = (du / un) * 100;
          steps.push({ label: 'I prosent', formula: 'ΔU % = ΔU / U · 100 %', substituted: `ΔU % = ${v(du, 'V')} / ${v(un, 'V')} · 100 %`, result: `ΔU = ${v(pct, '%')}` });
          answer.push(`ΔU = ${v(pct, '%')}`);
          const ploss = i * i * rl;
          steps.push({ label: 'Effekttap i ledningen', formula: 'P_tap = I² · R_L', substituted: `P_tap = (${v(i, 'A')})² · ${v(rl, 'Ω')}`, result: `P_tap = ${v(ploss, 'W')}` });
          answer.push(`P_tap = ${v(ploss, 'W')}`);
        }
        return {
          title: 'Spenningsfall – læringseksempel (forenklet modell)',
          steps,
          answer,
          notes: ['Dette er en forenklet læringsmodell. Resultatet er ikke en dimensjonering eller kontroll etter gjeldende normer.'],
        };
      }),
    [I, L, A, rho, U],
  );
  return (
    <>
      <Notice kind="warn" title="Læringseksempel – ikke dimensjonering">
        Denne kalkulatoren viser bare formelen for spenningsfall i en forenklet modell. Den tar ikke hensyn til forleggingsmåte, temperatur,
        reaktans, trefase, vernets egenskaper eller krav i gjeldende normer, og kan ikke brukes til å velge eller godkjenne kabeltverrsnitt i en
        virkelig installasjon.
      </Notice>
      <CalcCard
        title="Spenningsfall i ledning"
        level="forutsetninger"
        description="Spenningsfallet i en tolederkrets (frem og tilbake) beregnet ut fra ledningens resistans."
        assumptions={[
          'Enfase/likestrømsmodell med to ledere (derfor faktoren 2)',
          'Bare resistans – reaktans og effektfaktor er ikke tatt med',
          'Resistiviteten er konstant (temperaturen påvirker ikke resistansen i modellen)',
          'Standardverdien 0,0175 Ω·mm²/m er en vanlig lærebokverdi for kobber ved romtemperatur – endre ved behov',
          'L er enveis lengde fra kilde til last',
        ]}
        inputs={
          <>
            <Field label="Strøm I">
              <UnitInput value={I} onChange={setI} unit="A" placeholder="f.eks. 10" />
            </Field>
            <Field label="Lengde L (enveis)">
              <UnitInput value={L} onChange={setL} unit="m" placeholder="f.eks. 25" />
            </Field>
            <Field label="Ledertverrsnitt A">
              <UnitInput value={A} onChange={setA} unit="mm²" placeholder="f.eks. 2,5" />
            </Field>
            <Field label="Resistivitet ρ">
              <UnitInput value={rho} onChange={setRho} unit="Ω·mm²/m" />
            </Field>
            <Field label="Spenning U (valgfri, for prosent)">
              <UnitInput value={U} onChange={setU} unit="V" placeholder="f.eks. 230" />
            </Field>
          </>
        }
        result={<ResultView result={result} calcType="spenningsfall" inputs={{ I, L, A, rho, U }} />}
      />
    </>
  );
}
