import { Check } from 'lucide-react';

interface Step {
  label: string;
  step: number;
}

const STEPS: Step[] = [
  { step: 1, label: 'Test Details' },
  { step: 2, label: 'Add Questions' },
  { step: 3, label: 'Preview & Publish' },
];

export default function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((s, idx) => {
        const done = s.step < current;
        const active = s.step === current;
        return (
          <div key={s.step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${
                  done
                    ? 'bg-primary-500 border-primary-500 text-white'
                    : active
                    ? 'bg-white border-primary-500 text-primary-500'
                    : 'bg-white border-gray-200 text-gray-400'
                }`}
              >
                {done ? <Check size={14} /> : s.step}
              </div>
              <span
                className={`text-xs mt-1 font-medium ${
                  active ? 'text-primary-600' : done ? 'text-gray-600' : 'text-gray-400'
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`w-24 h-0.5 mb-4 mx-2 ${done ? 'bg-primary-500' : 'bg-gray-200'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
