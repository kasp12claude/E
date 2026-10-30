import { useMemo, useState } from 'react';
import { SYMBOLS } from '../../library/symbols';
import type { SymbolDef } from '../../library/types';
import { QuizCard, ScoreBar } from './QuizCard';
import { SymbolIcon } from './SymbolIcon';
import { pick, pickN, shuffle, useScore } from './progress';

// Symboler som tegnes likt som andre (f.eks. relékontakt = bryterkontakt) holdes utenfor,
// ellers ville spørsmålene hatt flere riktige svar.
const EXCLUDE = new Set(['relay-no', 'relay-nc', 'contactor-coil', 'sensor', 'protective-earth']);

const POOL: SymbolDef[] = SYMBOLS.filter((s) => (s.category === 'elektrisk' || s.category === 'installasjon') && !EXCLUDE.has(s.id));

type Mode = 'symbol-til-navn' | 'navn-til-symbol';

function makeTask() {
  const answer = pick(POOL);
  const others = pickN(
    POOL.filter((s) => s.id !== answer.id),
    3,
  );
  return { answer, options: shuffle([answer, ...others]) };
}

export function SymbolTraining() {
  const { score, record, reset } = useScore('symboler');
  const [mode, setMode] = useState<Mode>('symbol-til-navn');
  const [round, setRound] = useState(0);
  const task = useMemo(() => makeTask(), [round, mode]);
  const next = () => setRound((r) => r + 1);
  const a = task.answer;

  return (
    <div>
      <div className="row learn-toolbar">
        <div className="learn-segment" role="group" aria-label="Type oppgave">
          <button className={mode === 'symbol-til-navn' ? 'active' : ''} onClick={() => setMode('symbol-til-navn')}>
            Symbol → navn
          </button>
          <button className={mode === 'navn-til-symbol' ? 'active' : ''} onClick={() => setMode('navn-til-symbol')}>
            Navn → symbol
          </button>
        </div>
        <span className="spacer" />
        <ScoreBar score={score} onReset={reset} />
      </div>
      <p className="muted">
        Symbolene er forenklede gjengivelser etter prinsippene i IEC 60617. Lær deg å kjenne dem igjen – de brukes i koblingsskjema og dokumentasjon.
      </p>
      {mode === 'symbol-til-navn' ? (
        <QuizCard
          key={`${mode}-${round}`}
          question="Hvilken komponent viser symbolet?"
          media={
            <div className="learn-symbol-big">
              <SymbolIcon id={a.id} size={130} />
            </div>
          }
          options={task.options.map((o) => ({ id: o.id, label: o.name }))}
          correctId={a.id}
          hint={`Gruppe: ${a.group}. ${a.prefix ? `Vanlig bokstavkode er ${a.prefix}.` : ''}`}
          explanation={
            <>
              <strong>{a.name}</strong>: {a.description}
              {a.howItWorks && <div style={{ marginTop: 4 }}>{a.howItWorks}</div>}
            </>
          }
          onAnswered={record}
          onNext={next}
        />
      ) : (
        <QuizCard
          key={`${mode}-${round}`}
          tiles
          question={
            <>
              Hvilket symbol er <strong>{a.name}</strong>?
            </>
          }
          options={task.options.map((o) => ({
            id: o.id,
            label: (
              <span className="learn-symbol-tile">
                <SymbolIcon id={o.id} size={84} />
              </span>
            ),
          }))}
          correctId={a.id}
          hint={a.description}
          explanation={
            <>
              Riktig symbol for <strong>{a.name}</strong> er markert med grønt. {a.description}
            </>
          }
          onAnswered={record}
          onNext={next}
        />
      )}
    </div>
  );
}
