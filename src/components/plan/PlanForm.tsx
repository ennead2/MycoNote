'use client';

import { useState } from 'react';
import { Calendar, MapPin, Target, Map as MapIcon } from 'lucide-react';
import { Mushroom } from '@/components/icons/Mushroom';
import { Button } from '@/components/ui/Button';
import { TargetSpeciesInput } from '@/components/plan/TargetSpeciesInput';
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
        <label htmlFor="plan-target" className="inline-flex items-center gap-1.5 text-xs font-bold text-moss-light mb-1">
          <Mushroom size={14} aria-hidden="true" />
          {UI_TEXT.plan.fieldTarget}
        </label>
        <TargetSpeciesInput
          id="plan-target"
          value={targetSpecies}
          onChange={setTargetSpecies}
          placeholder={UI_TEXT.plan.fieldTargetPlaceholder}
        />
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
