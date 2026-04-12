'use client';

import { useState } from 'react';
import { Calendar, MapPin, Sprout, Target, Map as MapIcon, X } from 'lucide-react';
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
  'w-full rounded-lg bg-soil-surface border border-moss-primary text-washi-cream placeholder-washi-dim px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss-light';

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
      <p className="text-xs text-moss-light leading-relaxed">{UI_TEXT.plan.formDescription}</p>

      <div>
        <label htmlFor="plan-date" className="inline-flex items-center gap-1.5 text-xs font-bold text-moss-light mb-1">
          <Calendar size={14} aria-hidden="true" />
          {UI_TEXT.plan.fieldDate}
        </label>
        <input id="plan-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
      </div>

      <div>
        <label htmlFor="plan-location" className="inline-flex items-center gap-1.5 text-xs font-bold text-moss-light mb-1">
          <MapPin size={14} aria-hidden="true" />
          {UI_TEXT.plan.fieldLocation}
        </label>
        <input id="plan-location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={UI_TEXT.plan.fieldLocationPlaceholder} className={inputClass} />
      </div>

      <div>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-moss-light mb-1">
          <Sprout size={14} aria-hidden="true" />
          {UI_TEXT.plan.fieldTarget}
        </span>
        <select value="" onChange={(e) => { if (e.target.value) toggleSpecies(e.target.value); }} className={inputClass}>
          <option value="">{UI_TEXT.plan.fieldTargetPlaceholder}</option>
          {mushrooms.filter((m) => m.toxicity === 'edible' || m.toxicity === 'edible_caution').map((m) => (
            <option key={m.id} value={m.names.ja}>{m.names.ja}</option>
          ))}
        </select>
        {targetSpecies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {targetSpecies.map((name) => (
              <span key={name} className="inline-flex items-center gap-1 text-xs bg-soil-elevated text-washi-muted px-2 py-0.5 rounded-full">
                {name}
                <button type="button" onClick={() => toggleSpecies(name)} className="text-moss-light hover:text-washi-cream inline-flex items-center" aria-label={`${name} を削除`}>
                  <X size={12} aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-moss-light mb-2">
          <Target size={14} aria-hidden="true" />
          {UI_TEXT.plan.fieldExperience}
        </span>
        <div className="flex gap-2">
          {experienceLevels.map(({ value, label }) => (
            <Button key={value} type="button" variant={experienceLevel === value ? 'primary' : 'secondary'} size="sm" onClick={() => setExperienceLevel(value)} className="flex-1">
              {label}
            </Button>
          ))}
        </div>
      </div>

      <Button type="submit" variant="primary" size="lg" className="w-full inline-flex items-center justify-center gap-2">
        <MapIcon size={18} aria-hidden="true" />
        {UI_TEXT.plan.startChat}
      </Button>
    </form>
  );
}
