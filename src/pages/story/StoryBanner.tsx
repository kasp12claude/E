import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, X } from 'lucide-react';
import './story.css';

/** Nøkkel i localStorage som forteller tegneverktøyet at tegningen hører til et Story Mode-oppdrag */
export const EDITOR_BANNER_KEY = 'elektrostudio-story-editor-banner';

interface BannerInfo {
  docId: string;
  title: string;
  goal: string;
  instructions: string[];
}

export function readBanner(docId: string): BannerInfo | null {
  try {
    const b = JSON.parse(localStorage.getItem(EDITOR_BANNER_KEY) || 'null') as BannerInfo | null;
    return b?.docId === docId ? b : null;
  } catch {
    return null;
  }
}

/** Vises øverst i tegneverktøyet når man jobber med et oppdrag fra Story Mode */
export function StoryBanner({ info }: { info: BannerInfo }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [gone, setGone] = useState(false);
  if (gone) return null;
  return (
    <div className="story-banner">
      <span style={{ fontSize: 20 }}>🎓</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b>Story Mode-oppdrag: {info.title}</b> – {info.goal}
        {open && (
          <ol>
            {info.instructions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        )}
      </div>
      <button className="btn btn-sm btn-ghost" onClick={() => setOpen((o) => !o)}>
        {open ? 'Skjul steg' : 'Vis steg'}
      </button>
      <button className="btn btn-sm btn-primary" onClick={() => navigate('/story?fortsett=1')}>
        <CheckCircle2 size={14} /> Ferdig – kontroller oppdraget
      </button>
      <button
        className="icon-btn"
        title="Skjul banneret"
        aria-label="Skjul banneret"
        onClick={() => {
          setGone(true);
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
