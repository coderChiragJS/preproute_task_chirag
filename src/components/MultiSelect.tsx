import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';

interface Option {
  id: string;
  name: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  const remove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== id));
  };

  const selectedOptions = options.filter((o) => value.includes(o.id));

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`min-h-[38px] w-full border border-gray-200 rounded-lg px-3 py-1.5 bg-white flex flex-wrap gap-1 items-center cursor-pointer focus:ring-2 focus:ring-primary-500 ${
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-gray-300'
        }`}
      >
        {selectedOptions.length === 0 ? (
          <span className="text-sm text-gray-400">{placeholder}</span>
        ) : (
          selectedOptions.map((o) => (
            <span
              key={o.id}
              className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-xs font-medium px-2 py-0.5 rounded-md"
            >
              {o.name}
              <button type="button" onClick={(e) => remove(o.id, e)}>
                <X size={10} />
              </button>
            </span>
          ))
        )}
        <ChevronDown size={14} className="ml-auto text-gray-400 flex-shrink-0" />
      </div>

      {open && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {options.length === 0 ? (
            <p className="text-sm text-gray-500 px-3 py-2">No options available</p>
          ) : (
            options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => toggle(o.id)}
                className="flex items-center justify-between w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
              >
                <span className={value.includes(o.id) ? 'font-medium text-primary-600' : 'text-gray-700'}>
                  {o.name}
                </span>
                {value.includes(o.id) && <Check size={14} className="text-primary-500" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
