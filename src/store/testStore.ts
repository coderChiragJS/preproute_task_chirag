import { create } from 'zustand';
import type { Test, Question } from '../types';

interface TestWizardStore {
  currentTest: Test | null;
  questions: Question[];
  setCurrentTest: (test: Test) => void;
  setQuestions: (questions: Question[]) => void;
  clearWizard: () => void;
}

export const useTestStore = create<TestWizardStore>((set) => ({
  currentTest: null,
  questions: [],
  setCurrentTest: (test) => set({ currentTest: test }),
  setQuestions: (questions) => set({ questions }),
  clearWizard: () => set({ currentTest: null, questions: [] }),
}));
