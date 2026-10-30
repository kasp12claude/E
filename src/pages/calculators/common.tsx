import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Save } from 'lucide-react';
import { Notice, toast } from '../../components/ui';
import { useProjects } from '../../store/projects';
import { fmt, parseNum, uid } from '../../utils/id';

// ---------------------------------------------------------------------------
// Felles typer og hjelpefunksjoner for kalkulatorene
// ---------------------------------------------------------------------------

export interface CalcStep {
  label?: string;
  formula: string;
  substituted: string;
  result: string;
}

export interface CalcOutput {
  title: string;
  steps: CalcStep[];
  answer: string[];
  notes?: string[];
}

export type CalcResult = { kind: 'empty' } | { kind: 'error'; message: string } | { kind: 'ok'; out: CalcOutput };

/** Feil i en verdi brukeren har skrevet inn */
export class CalcError extends Error {}
/** Et felt mangler – vis ingen feil, bare en hjelpetekst */
class MissingInput extends Error {}

/**
 * any: alle tall · positive: > 0 · nonnegative: ≥ 0 · divisor: > 0 og brukes i nevneren
 */
export type Rule = 'any' | 'positive' | 'nonnegative' | 'divisor';

export function readNum(label: string, raw: string, rule: Rule = 'positive'): number {
  if (raw.trim() === '') throw new MissingInput(label);
  const n = parseNum(raw);
  if (!Number.isFinite(n)) throw new CalcError(`«${label}» må være et tall. Bruk komma eller punktum som desimaltegn.`);
  if ((rule === 'positive' || rule === 'divisor') && n === 0) {
    throw new CalcError(
      rule === 'divisor' ? `«${label}» kan ikke være null – det ville gitt deling på null.` : `«${label}» må være større enn null.`,
    );
  }
  if ((rule === 'positive' || rule === 'divisor') && n < 0) throw new CalcError(`«${label}» må være større enn null.`);
  if (rule === 'nonnegative' && n < 0) throw new CalcError(`«${label}» kan ikke være negativ.`);
  return n;
}

/** Leser et valgfritt felt. Tomt felt gir undefined. */
export function readOptional(label: string, raw: string, rule: Rule = 'positive'): number | undefined {
  if (raw.trim() === '') return undefined;
  return readNum(label, raw, rule);
}

export function readCosPhi(raw: string): number {
  const c = readNum('Effektfaktor cos φ', raw, 'positive');
  if (c > 1) throw new CalcError('Effektfaktoren cos φ må ligge mellom 0 og 1.');
  return c;
}

export function runCalc(fn: () => CalcOutput): CalcResult {
  try {
    return { kind: 'ok', out: fn() };
  } catch (e) {
    if (e instanceof MissingInput) return { kind: 'empty' };
    if (e instanceof CalcError) return { kind: 'error', message: e.message };
    console.error(e);
    return { kind: 'error', message: 'Beregningen kunne ikke utføres med disse verdiene.' };
  }
}

/** Tall med enhet, norsk desimalkomma */
export const v = (n: number, unit = '') => `${fmt(n)}${unit ? ` ${unit}` : ''}`;

export const SQRT2 = Math.SQRT2;
export const SQRT3 = Math.sqrt(3);

export function outputToText(out: CalcOutput): string {
  const lines: string[] = [];
  out.steps.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.label ? s.label + ': ' : ''}${s.formula}`);
    lines.push(`   ${s.substituted.replace(/\n/g, '\n   ')}`);
    lines.push(`   ${s.result.replace(/\n/g, '\n   ')}`);
  });
  lines.push(`Svar: ${out.answer.join(', ')}`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Visningskomponenter
// ---------------------------------------------------------------------------

export type Level = 'skole' | 'forutsetninger';

export function CalcCard({
  title,
  level,
  description,
  assumptions,
  inputs,
  result,
}: {
  title: string;
  level: Level;
  description?: ReactNode;
  assumptions?: string[];
  inputs: ReactNode;
  result: ReactNode;
}) {
  return (
    <section className="card calc-card">
      <div className="calc-card-head">
        <h2>{title}</h2>
        {level === 'skole' ? (
          <span className="badge badge-green">Skoleberegning</span>
        ) : (
          <span className="badge badge-yellow">Krever flere forutsetninger</span>
        )}
      </div>
      {description && <p className="muted calc-desc">{description}</p>}
      {assumptions && assumptions.length > 0 && (
        <div className="calc-assumptions">
          <span className="label">Forutsetninger</span>
          <ul>
            {assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="calc-layout">
        <div className="calc-inputs">{inputs}</div>
        <div className="calc-output">{result}</div>
      </div>
    </section>
  );
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="calc-segmented" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            className={`btn btn-sm ${value === o.id ? 'btn-primary' : ''}`}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ResultView({ result, calcType, inputs }: { result: CalcResult; calcType: string; inputs: Record<string, string> }) {
  if (result.kind === 'empty') return <div className="calc-empty muted">Fyll inn de kjente verdiene for å se utregningen trinn for trinn.</div>;
  if (result.kind === 'error')
    return (
      <Notice kind="danger" title="Kan ikke beregne">
        {result.message}
      </Notice>
    );
  const { out } = result;
  return (
    <div className="calc-result">
      {out.steps.map((s, i) => (
        <div className="calc-step" key={i}>
          <div className="calc-step-label">
            Trinn {i + 1}
            {s.label ? ` – ${s.label}` : ''}
          </div>
          <dl>
            <dt>Formel</dt>
            <dd className="mono">{s.formula}</dd>
            <dt>Innsatte verdier</dt>
            <dd className="mono">{s.substituted}</dd>
            <dt>Utregning</dt>
            <dd className="mono">{s.result}</dd>
          </dl>
        </div>
      ))}
      <div className="calc-answer">
        <span className="label">Svar</span>
        {out.answer.map((a) => (
          <strong key={a}>{a}</strong>
        ))}
      </div>
      {out.notes && out.notes.length > 0 && (
        <ul className="calc-notes small muted">
          {out.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      <SaveBar calcType={calcType} inputs={inputs} out={out} />
    </div>
  );
}

function SaveBar({ calcType, inputs, out }: { calcType: string; inputs: Record<string, string>; out: CalcOutput }) {
  const current = useProjects((s) => s.current);
  const update = useProjects((s) => s.update);
  if (!current) {
    return (
      <p className="small muted calc-save">
        Åpne eller opprett et prosjekt for å lagre beregningen. <Link to="/prosjekter">Gå til Mine prosjekter</Link>
      </p>
    );
  }
  return (
    <div className="calc-save">
      <button
        className="btn btn-sm"
        type="button"
        onClick={() => {
          update((p) => {
            p.calculations.unshift({
              id: uid('calc'),
              title: out.title,
              calcType,
              inputs: { ...inputs },
              result: outputToText(out),
              createdAt: Date.now(),
            });
          });
          toast(`Beregningen er lagret i «${current.name}»`);
        }}
      >
        <Save size={14} /> Lagre i prosjekt
      </button>
      <span className="small muted">Lagres i «{current.name}»</span>
    </div>
  );
}
