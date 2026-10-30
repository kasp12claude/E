import { useMemo, useState } from 'react';
import { QuizCard, ScoreBar } from './QuizCard';
import { shuffle, useScore } from './progress';

export interface BankQuestion {
  q: string;
  /** Første alternativ er det riktige – rekkefølgen stokkes ved visning */
  options: string[];
  hint: string;
  explanation: string;
}

/** Går gjennom en fast spørsmålsbank i tilfeldig rekkefølge. */
export function QuestionBank({ moduleId, questions }: { moduleId: string; questions: BankQuestion[] }) {
  const { score, record, reset } = useScore(moduleId);
  const [cycle, setCycle] = useState(0);
  const order = useMemo(() => shuffle(questions.map((_, i) => i)), [questions, cycle]);
  const [pos, setPos] = useState(0);
  const q = questions[order[pos]];
  const options = useMemo(() => shuffle(q.options.map((label, i) => ({ id: String(i), label }))), [q, pos, cycle]);

  const next = () => {
    if (pos + 1 >= order.length) {
      setCycle((c) => c + 1);
      setPos(0);
    } else setPos((p) => p + 1);
  };

  return (
    <div>
      <div className="row learn-toolbar">
        <span className="small muted">
          Spørsmål {pos + 1} av {order.length}
        </span>
        <span className="spacer" />
        <ScoreBar score={score} onReset={reset} />
      </div>
      <QuizCard
        key={`${cycle}-${pos}`}
        question={q.q}
        options={options}
        correctId="0"
        hint={q.hint}
        explanation={q.explanation}
        onAnswered={record}
        onNext={next}
      />
    </div>
  );
}
