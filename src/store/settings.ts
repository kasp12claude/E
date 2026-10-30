import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Settings {
  userName: string;
  school: string;
  className: string;
  gridSize: number;
  showGrid: boolean;
  snap: boolean;
  orthoWires: boolean;
  canvasTheme: 'dark' | 'light';
  autosaveDelay: number; // ms
  defaultWireColor: string;
  showHints: boolean;
  exportScale: number; // PNG-oppløsning
}

interface SettingsState extends Settings {
  set: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export const DEFAULT_SETTINGS: Settings = {
  userName: '',
  school: '',
  className: '',
  gridSize: 10,
  showGrid: true,
  snap: true,
  orthoWires: true,
  canvasTheme: 'dark',
  autosaveDelay: 800,
  defaultWireColor: '',
  showHints: true,
  exportScale: 2,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (patch) => set(patch),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    { name: 'elektrostudio-settings' },
  ),
);
