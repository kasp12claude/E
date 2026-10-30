import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { PageHeader, SafetyNotice, Tabs } from '../../components/ui';
import { useProjects } from '../../store/projects';
import { OhmCalc, PowerCalc } from './OhmPower';
import { ResistorsCalc } from './Resistors';
import { EnergyCalc } from './Energy';
import { UnitsCalc } from './Units';
import { AcPowerCalc, FrequencyCalc, PeakRmsCalc } from './AcCalcs';
import { StarDeltaCalc, ThreePhasePowerCalc, VoltageDropCalc } from './ThreePhase';
import { SavedCalcs } from './SavedCalcs';
import './calculators.css';

type Tab = 'ohm' | 'effekt' | 'motstand' | 'energi' | 'enheter' | 'ac' | 'trefase' | 'spenningsfall' | 'lagret';

const TAB_KEY = 'es-calc-tab';

export default function CalculatorsPage() {
  const [tab, setTabState] = useState<Tab>(() => {
    try {
      return (localStorage.getItem(TAB_KEY) as Tab) || 'ohm';
    } catch {
      return 'ohm';
    }
  });
  const setTab = (t: Tab) => {
    setTabState(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      /* ignorer */
    }
  };
  const savedCount = useProjects((s) => s.current?.calculations.length ?? 0);

  return (
    <div className="page">
      <PageHeader
        icon={<Calculator size={26} color="var(--accent-2)" />}
        title="Beregninger"
        description="Elektroberegninger med formel, innsatte verdier, utregning og svar. Velg hvilken størrelse som skal beregnes og skriv inn de kjente verdiene."
      />
      <SafetyNotice variant="calc" />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'ohm', label: 'Ohms lov' },
          { id: 'effekt', label: 'Effekt' },
          { id: 'motstand', label: 'Serie/parallell' },
          { id: 'energi', label: 'Energi' },
          { id: 'enheter', label: 'Enheter' },
          { id: 'ac', label: 'Vekselstrøm' },
          { id: 'trefase', label: 'Trefase' },
          { id: 'spenningsfall', label: 'Spenningsfall' },
          { id: 'lagret', label: `Lagrede (${savedCount})` },
        ]}
      />
      <div className="calc-stack">
        {tab === 'ohm' && <OhmCalc />}
        {tab === 'effekt' && <PowerCalc />}
        {tab === 'motstand' && <ResistorsCalc />}
        {tab === 'energi' && <EnergyCalc />}
        {tab === 'enheter' && <UnitsCalc />}
        {tab === 'ac' && (
          <>
            <PeakRmsCalc />
            <FrequencyCalc />
            <AcPowerCalc />
          </>
        )}
        {tab === 'trefase' && (
          <>
            <ThreePhasePowerCalc />
            <StarDeltaCalc />
          </>
        )}
        {tab === 'spenningsfall' && <VoltageDropCalc />}
        {tab === 'lagret' && <SavedCalcs />}
      </div>
    </div>
  );
}
