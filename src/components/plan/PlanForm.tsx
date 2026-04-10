'use client';

import { useState } from 'react';
import { mushrooms } from '@/data/mushrooms';
import { Button } from '@/components/ui/Button';
import { UI_TEXT } from '@/constants/ui-text';
import type { PlanContext, ExperienceLevel } from '@/types/chat';

interface PlanFormProps {
  onSubmit: (context: PlanContext) => void;
}

const experienceLevels: { value: ExperienceLevel; label: string }[] = [
  { value: 'beginner', label: UI_TEXT.plan.experienceBeginner },
  { value: 'intermediate', label: UI_TEXT.plan.experienceIntermediate },
  { value: 'advanced', label: UI_TEXT.plan.experienceAdvanced },
];

const inputClass =
  'w-full rounded-lg bg-forest-900 border border-forest-600 text-forest-100 placeholder-forest-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400';

export function PlanForm({ onSubmit }: PlanFormProps) {
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [targetSpecies, setTargetSpecies] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('intermediate');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const context: PlanContext = {
      date: date || undefined,
      location: location || undefined,
      targetSpecies: targetSpecies.length > 0 ? targetSpecies : undefined,
      experienceLevel,
      currentMonth: new Date().getMonth() + 1,
      recordsSummary: '',
    };
    onSubmit(context);
  };

  const toggleSpecies = (name: string) => {
    setTargetSpecies((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
      <p className="text-xs text-forest-400 leading-relaxed">{UI_TEXT.plan.formDescription}</p>

      <div>
        <label htmlFor="plan-date" className="block text-xs font-bold text-forest-400 mb-1">
          📅 {UI_TEXT.plan.fieldDate}
        </label>
        <input id="plan-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
      </div>

      <div>
        <label htmlFor="plan-location" className="block text-xs font-bold text-forest-400 mb-1">
          📍 {UI_TEXT.plan.fieldLocation}
        </label>
        <input id="plan-location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={UI_TEXT.plan.fieldLocationPlaceholder} className={inputClass} />
      </div>

      <div>
        <span className="block text-xs font-bold text-forest-400 mb-1">🍄 {UI_TEXT.plan.fieldTarget}</span>
        <select value="" onChange={(e) => { if (e.target.value) toggleSpecies(e.target.value); }} className={inputClass}>
          <option value="">{UI_TEXT.plan.fieldTargetPlaceholder}</option>
          {mushrooms.filter((m) => m.toxicity === 'edible' || m.toxicity === 'edible_caution').map((m) => (
            <option key={m.id} value={m.names.ja}>{m.names.ja}</option>
          ))}
        </select>
        {targetSpecies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {targetSpecies.map((name) => (
              <span key={name} className="inline-flex items-center gap-1 text-xs bg-forest-700 text-forest-200 px-2 py-0.5 rounded-full">
                {name}
                <button type="button" onClick={() => toggleSpecies(name)} className="text-forest-400 hover:text-forest-100">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <span className="block text-xs font-bold text-forest-400 mb-2">🎯 {UI_TEXT.plan.fieldExperience}</span>
        <div className="flex gap-2">
          {experienceLevels.map(({ value, label }) => (
            <Button key={value} type="button" variant={experienceLevel === value ? 'primary' : 'secondary'} size="sm" onClick={() => setExperienceLevel(value)} className="flex-1">
              {label}
            </Button>
          ))}
        </div>
      </div>

      <Button type="submit" variant="primary" size="lg" className="w-full">
        🗺 {UI_TEXT.plan.startChat}
      </Button>
    </form>
  );
}
