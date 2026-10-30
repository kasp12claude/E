import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Field, UnitInput } from '../../components/ui';
import { fmt } from '../../utils/id';
import { CalcCard, CalcError, ResultView, Segmented, readNum, readOptional, runCalc, v, type CalcStep } from './common';

type Mode = 'serie' | 'parallell';

export function ResistorsCalc() {
  const [mode, setMode] = useState<Mode>('serie');
  const [values, setValues] = useState<string[]>(['', '']);
  const [U, setU] = useState('');

  const result = useMemo(
    () =>
      runCalc(() => {
        if (values.length === 0) throw new CalcError('Legg til minst én motstand.');
        const rs = values.map((raw, i) => readNum(`R${i + 1}`, raw, 'positive'));
        const u = readOptional('Spenning U', U, 'nonnegative');
        const names = rs.map((_, i) => `R${i + 1}`);
        const steps: CalcStep[] = [];
        const answer: string[] = [];
        const notes: string[] = [];
        let rtot: number;
        if (mode === 'serie') {
          rtot = rs.reduce((a, b) => a + b, 0);
          steps.push({
            label: 'Total resistans',
            formula: `R_tot = ${names.join(' + ')}`,
            substituted: `R_tot = ${rs.map((r) => v(r, 'Ω')).join(' + ')}`,
            result: `R_tot = ${v(rtot, 'Ω')}`,
          });
        } else {
          const gsum = rs.reduce((a, r) => a + 1 / r, 0);
          rtot = 1 / gsum;
          steps.push({
            label: 'Total resistans',
            formula: `1 / R_tot = ${names.map((n) => `1/${n}`).join(' + ')}`,
            substituted: `1 / R_tot = ${rs.map((r) => `1/${fmt(r)}`).join(' + ')} = ${fmt(gsum)} S`,
            result: `R_tot = 1 / ${fmt(gsum)} S = ${v(rtot, 'Ω')}`,
          });
          if (rs.length === 2) notes.push('For to motstander i parallell gir også R_tot = (R1 · R2) / (R1 + R2) samme svar.');
          notes.push('I en parallellkobling er den totale resistansen alltid mindre enn den minste enkeltmotstanden.');
        }
        answer.push(`R_tot = ${v(rtot, 'Ω')}`);

        if (u !== undefined) {
          const itot = u / rtot;
          steps.push({
            label: 'Total strøm',
            formula: 'I = U / R_tot',
            substituted: `I = ${v(u, 'V')} / ${v(rtot, 'Ω')}`,
            result: `I = ${v(itot, 'A')}`,
          });
          answer.push(`I = ${v(itot, 'A')}`);
          if (mode === 'serie') {
            const parts = rs.map((r) => r * itot);
            steps.push({
              label: 'Delspenninger',
              formula: 'U_n = R_n · I',
              substituted: rs.map((r, i) => `U${i + 1} = ${v(r, 'Ω')} · ${v(itot, 'A')}`).join('\n'),
              result: parts.map((p, i) => `U${i + 1} = ${v(p, 'V')}`).join('\n'),
            });
            parts.forEach((p, i) => answer.push(`U${i + 1} = ${v(p, 'V')}`));
            notes.push(
              `Kontroll (Kirchhoffs spenningslov): ${parts.map((p) => fmt(p)).join(' + ')} = ${fmt(parts.reduce((a, b) => a + b, 0))} V, som er lik kildespenningen.`,
            );
            notes.push('I en seriekobling går den samme strømmen gjennom alle motstandene.');
          } else {
            const parts = rs.map((r) => u / r);
            steps.push({
              label: 'Delstrømmer',
              formula: 'I_n = U / R_n',
              substituted: rs.map((r, i) => `I${i + 1} = ${v(u, 'V')} / ${v(r, 'Ω')}`).join('\n'),
              result: parts.map((p, i) => `I${i + 1} = ${v(p, 'A')}`).join('\n'),
            });
            parts.forEach((p, i) => answer.push(`I${i + 1} = ${v(p, 'A')}`));
            notes.push(
              `Kontroll (Kirchhoffs strømlov): ${parts.map((p) => fmt(p)).join(' + ')} = ${fmt(parts.reduce((a, b) => a + b, 0))} A, som er lik totalstrømmen.`,
            );
            notes.push('I en parallellkobling ligger den samme spenningen over alle grenene.');
          }
          const ptot = u * itot;
          steps.push({ label: 'Total effekt', formula: 'P = U · I', substituted: `P = ${v(u, 'V')} · ${v(itot, 'A')}`, result: `P = ${v(ptot, 'W')}` });
          answer.push(`P = ${v(ptot, 'W')}`);
        } else {
          notes.push('Skriv inn spenningen U for å beregne strøm, delspenninger/delstrømmer og effekt.');
        }
        return {
          title: mode === 'serie' ? 'Seriekobling av motstander' : 'Parallellkobling av motstander',
          steps,
          answer,
          notes,
        };
      }),
    [mode, values, U],
  );

  const setAt = (i: number, val: string) => setValues((vs) => vs.map((x, j) => (j === i ? val : x)));

  return (
    <CalcCard
      title="Serie- og parallellkobling"
      level="skole"
      description="Beregn total resistans for motstander i serie eller parallell. Med spenning beregnes også strømmer og spenninger."
      assumptions={['Ideelle ledere uten resistans', 'Ideell spenningskilde (ingen indre resistans)']}
      inputs={
        <>
          <Segmented
            label="Koblingstype"
            value={mode}
            onChange={setMode}
            options={[
              { id: 'serie', label: 'Serie' },
              { id: 'parallell', label: 'Parallell' },
            ]}
          />
          <div className="field">
            <label>Motstander</label>
            <div className="col">
              {values.map((val, i) => (
                <div className="row calc-resistor-row" key={i}>
                  <span className="mono calc-rname">R{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <UnitInput value={val} onChange={(x) => setAt(i, x)} unit="Ω" placeholder="f.eks. 100" aria-label={`Resistans R${i + 1}`} />
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    title={`Fjern R${i + 1}`}
                    aria-label={`Fjern R${i + 1}`}
                    disabled={values.length <= 1}
                    onClick={() => setValues((vs) => vs.filter((_, j) => j !== i))}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div>
              <button type="button" className="btn btn-sm" style={{ marginTop: 6 }} disabled={values.length >= 12} onClick={() => setValues((vs) => [...vs, ''])}>
                <Plus size={14} /> Legg til motstand
              </button>
            </div>
          </div>
          <Field label="Spenning over koblingen U (valgfri)">
            <UnitInput value={U} onChange={setU} unit="V" placeholder="f.eks. 12" />
          </Field>
        </>
      }
      result={
        <ResultView
          result={result}
          calcType="serie-parallell"
          inputs={{ kobling: mode, U, ...Object.fromEntries(values.map((x, i) => [`R${i + 1}`, x])) }}
        />
      }
    />
  );
}
