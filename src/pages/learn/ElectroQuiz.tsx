import { useState } from 'react';
import { QuestionBank } from './QuestionBank';
import { QUIZ_CATEGORIES } from './quizBank';

type CategoryId = (typeof QUIZ_CATEGORIES)[number]['id'] | 'blandet';

const MIXED = QUIZ_CATEGORIES.flatMap((c) => c.questions);

/** Flervalgsquiz i tre kategorier, eller alle spørsmålene blandet */
export function ElectroQuiz() {
  const [cat, setCat] = useState<CategoryId>('grunnleggende');
  const current = QUIZ_CATEGORIES.find((c) => c.id === cat);
  const questions = current ? current.questions : MIXED;
  return (
    <div>
      <div className="chips" role="tablist" aria-label="Kategori">
        {QUIZ_CATEGORIES.map((c) => (
          <button key={c.id} role="tab" aria-selected={cat === c.id} className={`chip ${cat === c.id ? 'active' : ''}`} onClick={() => setCat(c.id)}>
            {c.label} ({c.questions.length})
          </button>
        ))}
        <button role="tab" aria-selected={cat === 'blandet'} className={`chip ${cat === 'blandet' ? 'active' : ''}`} onClick={() => setCat('blandet')}>
          Blandet – alle ({MIXED.length})
        </button>
      </div>
      {/* Ny nøkkel ved bytte av kategori, så spørsmålsrekkefølgen starter på nytt */}
      <QuestionBank key={cat} moduleId={`quiz-${cat}`} questions={questions} />
    </div>
  );
}
