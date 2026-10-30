// Verktøybeltet i Elektrikerspillet. Hver handling krever riktig verktøy i hånda.

export type Tool = 'hand' | 'las' | 'tester' | 'skrutrekker' | 'tang' | 'klemme' | 'kontrolltester';

export const TOOLS: { id: Tool; key: string; name: string; icon: string; use: string }[] = [
  { id: 'hand', key: '1', name: 'Hånd', icon: '✋', use: 'Brytere, dører og sikringsskap' },
  { id: 'las', key: '2', name: 'Lås og skilt', icon: '🔒', use: 'Sikre kursen mot innkobling i sikringsskapet' },
  { id: 'tester', key: '3', name: 'Spenningstester', icon: '📟', use: 'Måle at det er spenningsløst ved koblingsboksen' },
  { id: 'skrutrekker', key: '4', name: 'Isolert skrutrekker', icon: '🪛', use: 'Åpne koblingsboksen' },
  { id: 'tang', key: '5', name: 'Avisoleringstang', icon: '✂️', use: 'Fjerne isolasjonen på lederendene i boksen' },
  { id: 'klemme', key: '6', name: 'Koblingsklemmer', icon: '🔗', use: 'Skjøte lederne sammen i boksen' },
  { id: 'kontrolltester', key: '7', name: 'Kontrolltester', icon: '🔌', use: 'Teste stikkontakter (spenning og jord)' },
];

export const toolName = (t: Tool) => TOOLS.find((x) => x.id === t)!.name;
export const toolKey = (t: Tool) => TOOLS.find((x) => x.id === t)!.key;
/** «avisoleringstang (5)» – brukes i meldinger */
export const toolRef = (t: Tool) => (t === 'hand' ? 'hånda (1)' : `${toolName(t).toLowerCase()} (${toolKey(t)})`);
