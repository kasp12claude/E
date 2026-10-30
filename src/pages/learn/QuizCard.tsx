import { useState, type ReactNode } from 'react';
import { ArrowRight, CheckCircle2, Lightbulb, RotateCcw, XCircle } from 'lucide-react';
import type { Score } from './progress';

export interface QuizOption {
  id: string;
  label: ReactNode;
}

interface Props {
  question: ReactNode;
  /** Illustrasjon over spørsmålet (symbol, krets o.l.) */
  media?: ReactNode;
  options: QuizOption[];
  correctId: string;
  hint?: ReactNode;
  explanation: ReactNode;
  onAnswered?: (correct: boolean) => void;
  onNext?: () => void;
  /** Vis alternativene som store fliser (f.eks. symboler) */
  tiles?: boolean;
}

/**
 * Felles flervalgskort. Gjenbruk med `key` for å nullstille mellom oppgaver.
 * Første svar teller i poengsummen.
 */
export function QuizCard({ question, media, options, correctId, hint, explanation, onAnswered, onNext, tiles }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const answered = selected !== null;
  const correct = selected === correctId;

  const choose = (id: string) => {
    if (answered) return;
    setSelected(id);
    onAnswered?.(id === correctId);
  };

  return (
    <div className="card learn-quiz">
      <div className="learn-question">{question}</div>
      {media && <div className="learn-media">{media}</div>}
      <div className={tiles ? 'learn-options tiles' : 'learn-options'}>
        {options.map((o) => {
          let cls = 'learn-option';
          if (answered && o.id === correctId) cls += ' correct';
          else if (answered && o.id === selected) cls += ' wrong';
          return (
            <button key={o.id} className={cls} onClick={() => choose(o.id)} disabled={answered && o.id !== selected && o.id !== correctId}>
              {o.label}
            </button>
          );
        })}
      </div>
      {showHint && hint && !answered && (
        <div className="notice notice-info learn-hint">
          <Lightbulb size={18} color="var(--warn)" />
          <div>{hint}</div>
        </div>
      )}
      {answered && (
        <div className={`notice ${correct ? 'notice-ok' : 'notice-danger'}`}>
          {correct ? <CheckCircle2 size={18} color="var(--ok)" /> : <XCircle size={18} color="var(--danger)" />}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{correct ? 'Riktig!' : 'Ikke helt riktig.'}</div>
            {explanation}
          </div>
        </div>
      )}
      <div className="row">
        {hint && !answered && (
          <button className="btn" onClick={() => setShowHint((h) => !h)}>
            <Lightbulb size={16} /> {showHint ? 'Skjul hint' : 'Vis hint'}
          </button>
        )}
        <span className="spacer" />
        {onNext && (
          <button className={`btn ${answered ? 'btn-primary' : ''}`} onClick={onNext}>
            {answered ? 'Neste oppgave' : 'Hopp over'} <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

export function ScoreBar({ score, onReset }: { score: Score; onReset: () => void }) {
  const pct = score.total ? Math.round((score.correct / score.total) * 100) : 0;
  return (
    <div className="learn-score row">
      <span className="badge badge-blue">
        {score.correct} av {score.total} riktige{score.total ? ` (${pct} %)` : ''}
      </span>
      {score.total > 0 && (
        <button className="btn btn-ghost btn-sm" onClick={onReset} title="Nullstill poeng for denne modulen">
          <RotateCcw size={14} /> Nullstill
        </button>
      )}
    </div>
  );
}
