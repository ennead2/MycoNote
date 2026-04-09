'use client';

import { useState } from 'react';
import { UI_TEXT } from '@/constants/ui-text';
import type { IdentifyInput } from '@/lib/identify-matcher';

interface FeatureSelectorProps {
  input: IdentifyInput;
  onChange: (input: IdentifyInput) => void;
}

interface ChipOption {
  value: string;
  label: string;
}

function ChipGroup({
  label,
  icon,
  options,
  selected,
  onSelect,
  required,
}: {
  label: string;
  icon: string;
  options: ChipOption[];
  selected?: string;
  onSelect: (value: string | undefined) => void;
  required?: boolean;
}) {
  return (
    <div className="mb-3">
      <div className="text-[10px] font-bold text-forest-400 mb-1.5">
        {icon} {label} {required && <span className="text-amber-500">*</span>}
      </div>
      <div className="flex gap-1 flex-wrap">
        {options.map(({ value, label: chipLabel }) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(selected === value ? undefined : value)}
            className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
              selected === value
                ? 'bg-forest-500 text-white border-forest-400'
                : 'bg-forest-900 text-forest-400 border-forest-700 hover:border-forest-500'
            }`}
          >
            {chipLabel}
          </button>
        ))}
      </div>
    </div>
  );
}

const T = UI_TEXT.identify;

const REQUIRED_GROUPS: { key: keyof IdentifyInput; label: string; icon: string; options: ChipOption[] }[] = [
  {
    key: 'gill_type', label: T.gillType, icon: '🔬',
    options: [
      { value: 'gills', label: T.gillTypeGills },
      { value: 'pores', label: T.gillTypePores },
      { value: 'teeth', label: T.gillTypeTeeth },
      { value: 'none', label: T.gillTypeNone },
    ],
  },
  {
    key: 'cap_color', label: T.capColor, icon: '🎨',
    options: [
      { value: 'white', label: T.colorWhite },
      { value: 'brown', label: T.colorBrown },
      { value: 'red', label: T.colorRed },
      { value: 'yellow', label: T.colorYellow },
      { value: 'orange', label: T.colorOrange },
      { value: 'gray', label: T.colorGray },
      { value: 'black', label: T.colorBlack },
    ],
  },
  {
    key: 'cap_shape', label: T.capShape, icon: '🍄',
    options: [
      { value: 'flat', label: T.shapeFlat },
      { value: 'convex', label: T.shapeConvex },
      { value: 'funnel', label: T.shapeFunnel },
      { value: 'hemisphere', label: T.shapeHemisphere },
      { value: 'conical', label: T.shapeConical },
    ],
  },
  {
    key: 'cap_size', label: T.capSize, icon: '📏',
    options: [
      { value: 'small', label: T.sizeSmall },
      { value: 'medium', label: T.sizeMedium },
      { value: 'large', label: T.sizeLarge },
    ],
  },
];

const EXTRA_GROUPS: { key: keyof IdentifyInput; label: string; icon: string; options: ChipOption[] }[] = [
  {
    key: 'gill_attachment', label: T.gillAttachment, icon: '📎',
    options: [
      { value: 'free', label: T.attachFree },
      { value: 'attached', label: T.attachAttached },
      { value: 'decurrent', label: T.attachDecurrent },
      { value: 'sinuate', label: T.attachSinuate },
    ],
  },
  {
    key: 'stalk_color', label: T.stalkColor, icon: '🎨',
    options: [
      { value: 'white', label: T.colorWhite },
      { value: 'brown', label: T.colorBrown },
      { value: 'yellow', label: T.colorYellow },
      { value: 'gray', label: T.colorGray },
    ],
  },
  {
    key: 'stalk_features', label: T.stalkFeatures, icon: '🔧',
    options: [
      { value: 'ring', label: T.featureRing },
      { value: 'volva', label: T.featureVolva },
      { value: 'hollow', label: T.featureHollow },
      { value: 'fibrous', label: T.featureFibrous },
    ],
  },
  {
    key: 'bruising', label: T.bruising, icon: '🩹',
    options: [
      { value: 'blue', label: T.bruisingBlue },
      { value: 'red', label: T.bruisingRed },
      { value: 'yellow', label: T.bruisingYellow },
      { value: 'none', label: T.bruisingNone },
    ],
  },
  {
    key: 'substrate', label: T.substrateLabel, icon: '🌲',
    options: [
      { value: 'broadleaf', label: T.substrateBroadleaf },
      { value: 'conifer', label: T.substrateConifer },
      { value: 'grass', label: T.substrateGrass },
      { value: 'deadwood', label: T.substrateDeadwood },
    ],
  },
];

export function FeatureSelector({ input, onChange }: FeatureSelectorProps) {
  const [showExtra, setShowExtra] = useState(false);

  const handleSelect = (key: keyof IdentifyInput, value: string | undefined) => {
    const next = { ...input };
    if (value === undefined) {
      delete next[key];
    } else {
      (next as Record<string, string>)[key] = value;
    }
    onChange(next);
  };

  const extraCount = EXTRA_GROUPS.length;

  return (
    <div>
      {REQUIRED_GROUPS.map((group) => (
        <ChipGroup
          key={group.key}
          label={group.label}
          icon={group.icon}
          options={group.options}
          selected={input[group.key]}
          onSelect={(v) => handleSelect(group.key, v)}
          required
        />
      ))}

      <button
        type="button"
        onClick={() => setShowExtra(!showExtra)}
        className="w-full py-2 bg-forest-900 border border-forest-700 rounded-md text-xs text-forest-500 mb-3 hover:border-forest-500"
      >
        {showExtra ? `▲ ${T.lessFilters}` : `▼ ${T.moreFilters}（${extraCount}項目）`}
      </button>

      {showExtra && EXTRA_GROUPS.map((group) => (
        <ChipGroup
          key={group.key}
          label={group.label}
          icon={group.icon}
          options={group.options}
          selected={input[group.key]}
          onSelect={(v) => handleSelect(group.key, v)}
        />
      ))}
    </div>
  );
}
