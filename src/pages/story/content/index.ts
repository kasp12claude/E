// Register for alt innhold i Story Mode. Nye kapitler legges til her.
import type { StoryContent } from '../types';
import { chapter1, missions1, scenes1 } from './chapter1';
import { chapter2, missions2, scenes2 } from './chapter2';
import { chapter3, missions3, scenes3 } from './chapter3';
import { chapter4, missions4, scenes4 } from './chapter4';
import { chapter5, missions5, scenes5 } from './chapter5';
import { RETAKE_SCENES, SUBJECT_OF } from './school';
import { LESSONS } from './lessons';

const missions = [...missions1, ...missions2, ...missions3, ...missions4, ...missions5].map((m) => ({
  ...m,
  subject: m.subject ?? SUBJECT_OF[m.id],
  lesson: m.lesson ?? LESSONS[m.id],
}));

export const CONTENT: StoryContent = {
  chapters: [chapter1, chapter2, chapter3, chapter4, chapter5],
  scenes: [...scenes1, ...scenes2, ...scenes3, ...scenes4, ...scenes5, ...RETAKE_SCENES],
  missions,
};
