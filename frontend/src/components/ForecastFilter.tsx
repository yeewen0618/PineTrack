import React from 'react';

interface ForecastFilterProps {
  selected: '1W' | '3M' | '1Y';
  onChange: (value: '1W' | '3M' | '1Y') => void;
}

export function ForecastFilter({ selected, onChange }: ForecastFilterProps) {
  const options: Array<{ value: '1W' | '3M' | '1Y'; label: string }> = [
    { value: '1W', label: '1W' },
    { value: '3M', label: '3M' },
    { value: '1Y', label: '1Y' }
  ];

  return (
    <div className="flex items-center gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-4 py-1.5 rounded-lg border text-[14px] transition-all ${
            selected === option.value
              ? 'bg-[#DCFCE7] border-[#16A34A] text-[#15803D]'
              : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#15803D]'
          }`}
          aria-label={`Select ${option.label} forecast`}
          aria-pressed={selected === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}