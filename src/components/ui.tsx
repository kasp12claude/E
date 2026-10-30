import { useEffect, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from 'lucide-react';
import { create } from 'zustand';

// --------------------------------------------------------------------------
// Toast-meldinger
// --------------------------------------------------------------------------
interface Toast {
  id: number;
  text: string;
  error?: boolean;
}
interface ToastState {
  toasts: Toast[];
  push: (text: string, error?: boolean) => void;
}
let toastId = 1;
export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (text, error) => {
    const id = toastId++;
    set((s) => ({ toasts: [...s.toasts, { id, text, error }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3200);
  },
}));
export const toast = (text: string, error = false) => useToasts.getState().push(text, error);

export function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.error ? 'error' : ''}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

// --------------------------------------------------------------------------
// Grunnkomponenter
// --------------------------------------------------------------------------
export function PageHeader({ title, description, actions, icon }: { title: string; description?: ReactNode; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="row" style={{ gap: 10 }}>
          {icon}
          {title}
        </h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}

export function Field({ label, children, hint }: { label: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <span className="small muted">{hint}</span>}
    </div>
  );
}

export function UnitInput({
  value,
  onChange,
  unit,
  placeholder,
  ...rest
}: { value: string; onChange: (v: string) => void; unit?: string; placeholder?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  return (
    <div className="input-unit">
      <input className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} inputMode="decimal" {...rest} />
      {unit && <span>{unit}</span>}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className={`tab ${value === t.id ? 'active' : ''}`} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <span>{title}</span>
          <span className="spacer" />
          <button className="icon-btn" onClick={onClose} aria-label="Lukk">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Notice({ kind = 'info', children, title }: { kind?: 'info' | 'warn' | 'danger' | 'ok'; children: ReactNode; title?: ReactNode }) {
  const Icon = kind === 'warn' ? AlertTriangle : kind === 'danger' ? ShieldAlert : kind === 'ok' ? CheckCircle2 : Info;
  const color = kind === 'warn' ? 'var(--warn)' : kind === 'danger' ? 'var(--danger)' : kind === 'ok' ? 'var(--ok)' : 'var(--accent-2)';
  return (
    <div className={`notice notice-${kind}`}>
      <Icon size={18} color={color} />
      <div>
        {title && <div style={{ fontWeight: 600, marginBottom: 2 }}>{title}</div>}
        {children}
      </div>
    </div>
  );
}

/** Standard sikkerhetsmerknad: skiller læring/simulering fra virkelige installasjoner. */
export function SafetyNotice({ variant = 'general' }: { variant?: 'general' | 'simulation' | 'calc' | 'drawing' }) {
  const text = {
    general:
      'ElektroStudio er et lærings- og tegneverktøy. Arbeid på virkelige elektriske anlegg skal bare utføres av kvalifisert personell og etter gjeldende forskrifter og normer.',
    simulation:
      'Simulatoren er en forenklet, idealisert pedagogisk modell for lav spenning. Den erstatter ikke praktisk testing, måling eller sikkerhetskontroll av virkelige kretser.',
    calc:
      'Beregningene er skoleberegninger basert på verdiene du skriver inn. Resultatene er ikke en godkjenning eller dimensjonering av en faktisk elektrisk installasjon.',
    drawing:
      'Tegningene kontrolleres ikke automatisk mot gjeldende regler. Koblingskontrollen finner bare tekniske feil i tegningen (løse ender o.l.) og erstatter ikke kvalifisert faglig vurdering.',
  }[variant];
  return (
    <Notice kind={variant === 'general' ? 'warn' : 'info'} title={variant === 'general' ? 'Sikkerhet' : undefined}>
      {text}
    </Notice>
  );
}

export function Empty({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="empty">
      {icon && <div style={{ marginBottom: 8, opacity: 0.7 }}>{icon}</div>}
      {children}
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="progress" aria-valuenow={Math.round(value * 100)} role="progressbar">
      <div style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

export function confirmAction(text: string) {
  return window.confirm(text);
}
