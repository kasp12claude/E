import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, GraduationCap, XCircle } from 'lucide-react';
import type { Lesson } from './types';
import { char } from './world';
import { SymbolIcon } from '../../editor/SymbolIcon';
import { shuffle } from '../learn/progress';

function SlideBody({ slide }: { slide: Lesson['slides'][number] }) {
  return (
    <div className="slide-body">
      <div className="slide-text">
        <p>{slide.text}</p>
        {slide.formula && <div className="slide-formula">{slide.formula}</div>}
        {slide.example && (
          <div className="slide-example">
            <b>Eksempel:</b> {slide.example}
          </div>
        )}
      </div>
      {slide.symbol && (
        <div className="slide-symbol">
          <SymbolIcon symbolId={slide.symbol} size={110} color="#d6e4ff" />
        </div>
      )}
    </div>
  );
}

/** Undervisning: læreren går gjennom stoffet lysbilde for lysbilde før oppgaven */
export function LessonView({ lesson, onDone }: { lesson: Lesson; onDone: () => void }) {
  const t = char(lesson.teacher);
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const total = lesson.slides.length + (lesson.check ? 1 : 0);
  const onCheck = lesson.check && i === lesson.slides.length;
  const options = useMemo(() => (lesson.check ? shuffle(lesson.check.options) : []), [lesson]);
  const slide = lesson.slides[i];
  const last = i === total - 1;

  return (
    <div className="lesson">
      <div className="lesson-head">
        {t && (
          <span className="dlg-avatar big" style={{ background: t.color }}>
            {t.avatar}
          </span>
        )}
        <div>
          <div className="small muted">
            <GraduationCap size={13} /> Undervisning · {t?.name}
          </div>
          <h3>{lesson.title}</h3>
        </div>
      </div>
      <div className="lesson-dots">
        {Array.from({ length: total }, (_, k) => (
          <span key={k} className={`ldot ${k === i ? 'on' : k < i ? 'done' : ''}`} />
        ))}
      </div>

      {onCheck && lesson.check ? (
        <div className="lesson-card">
          <div className="slide-title">Forstod du det? (teller ikke på karakteren)</div>
          <p>{lesson.check.q}</p>
          <div className="lesson-options">
            {options.map((o) => {
              const right = o === lesson.check!.options[0];
              const cls = answer === null ? '' : right ? 'right' : answer === o ? 'wrong' : '';
              return (
                <button key={o} className={`dlg-choice ${cls}`} disabled={answer !== null} onClick={() => setAnswer(o)}>
                  {answer !== null && right ? <CheckCircle2 size={15} /> : answer === o ? <XCircle size={15} /> : null}
                  <span>{o}</span>
                </button>
              );
            })}
          </div>
          {answer !== null && <div className="notice notice-info small">{lesson.check.explanation}</div>}
        </div>
      ) : (
        <div className="lesson-card">
          <div className="slide-title">
            {i + 1}. {slide.title}
          </div>
          <SlideBody slide={slide} />
        </div>
      )}

      <div className="row">
        <button className="btn btn-ghost" disabled={i === 0} onClick={() => setI(i - 1)}>
          <ArrowLeft size={15} /> Forrige
        </button>
        <span className="spacer" />
        {last ? (
          <button className="btn btn-primary" disabled={!!onCheck && answer === null} onClick={onDone}>
            Jeg er klar – start oppgaven <ArrowRight size={15} />
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => setI(i + 1)} autoFocus>
            Neste <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Notatene fra timen, som kan åpnes mens man jobber */
export function LessonNotes({ lesson }: { lesson: Lesson }) {
  return (
    <details className="lesson-notes">
      <summary>
        <GraduationCap size={14} /> Notatene dine fra timen: {lesson.title}
      </summary>
      {lesson.slides.map((s, i) => (
        <div key={i} className="note-slide">
          <b>{s.title}</b>
          <SlideBody slide={s} />
        </div>
      ))}
    </details>
  );
}
