import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { PageHeader, SafetyNotice, Tabs } from '../../components/ui';
import { SymbolTraining } from './SymbolTraining';
import { SchematicQuiz } from './SchematicQuiz';
import { SeriesParallel } from './SeriesParallel';
import { FaultFinding } from './FaultFinding';
import { HmsQuiz } from './HmsQuiz';
import { MotorControl } from './MotorControl';
import { HowItWorks } from './HowItWorks';
import { ElectroQuiz } from './ElectroQuiz';
import { loadProgress } from './progress';
import './learn.css';

type ModuleId = 'quiz' | 'symboler' | 'skjema' | 'serie-parallell' | 'feilsoking' | 'hms' | 'motorstyring' | 'komponenter';

const MODULES: { id: ModuleId; label: string; description: string }[] = [
  { id: 'quiz', label: 'Quiz', description: 'Flervalgsspørsmål om elektrolære, installasjon og måling – med hint og forklaring.' },
  { id: 'symboler', label: 'Symboltrening', description: 'Kjenn igjen komponenter ut fra symbolet – og omvendt.' },
  { id: 'skjema', label: 'Forstå koblingsskjema', description: 'Les små skjema og forutsi hva som skjer.' },
  { id: 'serie-parallell', label: 'Serie og parallell', description: 'Regneoppgaver med fasit og trinnvis utregning.' },
  { id: 'feilsoking', label: 'Feilsøking', description: 'Finn feilen i en simulert krets med virtuelt multimeter.' },
  { id: 'hms', label: 'HMS og elsikkerhet', description: 'Spørsmål om sikker arbeidsmåte.' },
  { id: 'motorstyring', label: 'Motorstyring', description: 'Kontaktor, selvhold, motorvern og forrigling.' },
  { id: 'komponenter', label: 'Slik virker komponentene', description: 'Oppslag med forklaringer.' },
];

const TAB_KEY = 'elektrostudio-learn-tab';

export default function LearnPage() {
  const [tab, setTab] = useState<ModuleId>(() => {
    try {
      const t = localStorage.getItem(TAB_KEY) as ModuleId | null;
      return t && MODULES.some((m) => m.id === t) ? t : 'symboler';
    } catch {
      return 'symboler';
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(TAB_KEY, tab);
    } catch {
      /* ignorer */
    }
  }, [tab]);

  const progress = loadProgress();
  const current = MODULES.find((m) => m.id === tab)!;

  return (
    <div className="page learn-page">
      <PageHeader
        icon={<GraduationCap size={26} color="var(--accent-2)" />}
        title="Lær elektro"
        description="Interaktive oppgaver om komponenter, skjema, beregninger, feilsøking og sikkerhet. Du får hint underveis og forklaring når noe blir feil. Fremgangen lagres i nettleseren."
      />
      <Tabs
        tabs={MODULES.map((m) => {
          // Quiz-fanen samler poeng fra alle kategoriene (lagret som «quiz-…»)
          const s =
            m.id === 'quiz'
              ? Object.entries(progress)
                  .filter(([k]) => k.startsWith('quiz-'))
                  .reduce((a, [, v]) => ({ correct: a.correct + v.correct, total: a.total + v.total }), { correct: 0, total: 0 })
              : progress[m.id];
          return {
            id: m.id,
            label: (
              <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                {m.label}
                {s && s.total > 0 && <span className="badge">{s.correct}/{s.total}</span>}
              </span>
            ),
          };
        })}
        value={tab}
        onChange={setTab}
      />
      <p className="muted" style={{ marginTop: -6 }}>
        {current.description}
      </p>
      {tab === 'quiz' && <ElectroQuiz />}
      {tab === 'symboler' && <SymbolTraining />}
      {tab === 'skjema' && <SchematicQuiz />}
      {tab === 'serie-parallell' && <SeriesParallel />}
      {tab === 'feilsoking' && <FaultFinding />}
      {tab === 'hms' && <HmsQuiz />}
      {tab === 'motorstyring' && <MotorControl />}
      {tab === 'komponenter' && <HowItWorks />}
      {tab !== 'feilsoking' && (
        <div style={{ marginTop: 24 }}>
          <SafetyNotice variant="general" />
        </div>
      )}
    </div>
  );
}
