import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Modal } from '../../components/ui';
import type { StoryState, Subject } from './types';
import { SUBJECTS } from './content/school';
import { currentChapter, isGraded, stageInfo, subjectGrades, useStory } from './engine';
import { isCheatCode, setGrades, skipYear } from './cheats';

const UNLOCK_KEY = 'elektrostudio-story-juks';

function unlocked() {
  try {
    return localStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

/** Knapp i toppen av Story Mode: skriv inn en juksekode for å åpne juksemenyen */
export function CheatButton({ s }: { s: StoryState }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-sm" onClick={() => setOpen(true)} title="Juksekode">
        <KeyRound size={14} /> Kode
      </button>
      {open && <CheatMenu s={s} onClose={() => setOpen(false)} />}
    </>
  );
}

function CheatMenu({ s, onClose }: { s: StoryState; onClose: () => void }) {
  const update = useStory((x) => x.update);
  const [ok, setOk] = useState(unlocked);
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState(false);
  const ch = currentChapter(s);
  const graded = isGraded(ch.id);
  const exam = ch.id === 'k5';
  const [grades, setG] = useState<Record<Subject, number>>(() => {
    const cur = subjectGrades(s, ch.id);
    return Object.fromEntries(SUBJECTS.map((x) => [x.id, cur.find((c) => c.subject.id === x.id)?.grade ?? 6])) as Record<Subject, number>;
  });
  const [failExam, setFailExam] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const tryCode = () => {
    if (isCheatCode(code)) {
      setOk(true);
      setWrong(false);
      try {
        localStorage.setItem(UNLOCK_KEY, '1');
      } catch {
        /* ignorer */
      }
    } else setWrong(true);
  };

  const anyOne = graded && Object.values(grades).some((g) => g === 1);
  const finished = !!s.flags.karriere_fullfort;

  return (
    <Modal title="Juksekode" onClose={onClose} footer={<button className="btn" onClick={onClose}>Lukk</button>}>
      {!ok ? (
        <form
          className="cheat-code"
          onSubmit={(e) => {
            e.preventDefault();
            tryCode();
          }}
        >
          <p className="small muted">Skriv inn en juksekode.</p>
          <div className="row">
            <input className="input" autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="Kode" aria-label="Juksekode" />
            <button className="btn btn-primary" type="submit">
              OK
            </button>
          </div>
          {wrong && <div className="notice notice-warn small">Feil kode.</div>}
        </form>
      ) : finished ? (
        <p>Karrieren er allerede fullført – det er ingen flere år å hoppe over.</p>
      ) : (
        <div className="cheat-menu">
          <div className="small muted">
            Nå: {stageInfo(s.stage).name} · «{ch.title}»
          </div>

          {graded && (
            <>
              <div className="label">Velg karakterene dine i år</div>
              {SUBJECTS.map((sub) => (
                <div key={sub.id} className="cheat-row">
                  <span>{sub.name}</span>
                  <div className="cheat-grades">
                    {[1, 2, 3, 4, 5, 6].map((g) => (
                      <button key={g} className={`cheat-g g${g} ${grades[sub.id] === g ? 'on' : ''}`} onClick={() => setG((cur) => ({ ...cur, [sub.id]: g }))}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {anyOne && <div className="notice notice-warn small">Med karakter 1 i et fag må du ta året på nytt – ett år eldre enn klassen.</div>}
              <button
                className="btn"
                onClick={() => {
                  update((x) => setGrades(x, grades));
                  setDone('Karakterene på oppdragene du har gjort i år er endret.');
                }}
              >
                Bare sett karakterene (bli i året)
              </button>
            </>
          )}

          {exam && (
            <label className="row small">
              <input type="checkbox" checked={failExam} onChange={(e) => setFailExam(e.target.checked)} /> Stryk på fagprøven med vilje
            </label>
          )}
          {!graded && !exam && <p className="small muted">Lærlingåret har ingen karakterer. Alle hovedoppdragene blir godkjent.</p>}

          <button
            className="btn btn-primary"
            onClick={() => {
              update((x) => skipYear(x, { grades, failExam }));
              onClose();
            }}
          >
            Hopp over {graded ? 'skoleåret' : exam ? 'fagprøven' : 'året'} {graded ? 'med disse karakterene' : ''}
          </button>
          {done && <div className="notice notice-ok small">{done}</div>}
          <p className="small muted">Lagringen blir merket med at juksekode er brukt.</p>
        </div>
      )}
    </Modal>
  );
}
