'use client';

import { useState, type ReactNode } from 'react';
import { UI_TEXT } from '@/constants/ui-text';
import type { IdentifyInput } from '@/lib/identify-matcher';

interface FeatureSelectorProps {
  input: IdentifyInput;
  onChange: (input: IdentifyInput) => void;
}

interface ChipOption {
  value: string;
  label: string;
  iconFn?: (active: boolean) => ReactNode;
}

// --- SVG アイコン ---

const S = 20; // icon size

function CapShapeIcon({ shape, active }: { shape: string; active: boolean }) {
  const c = active ? '#fff' : '#6a8a60';
  const paths: Record<string, string> = {
    flat: 'M2 12 Q10 10 18 12',
    convex: 'M2 14 Q10 6 18 14',
    funnel: 'M4 8 Q10 14 16 8',
    hemisphere: 'M2 14 Q10 2 18 14',
    conical: 'M4 16 L10 4 L16 16',
  };
  return (
    <svg width={S} height={S} viewBox="0 0 20 20">
      <path d={paths[shape] ?? ''} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function GillTypeIcon({ type, active }: { type: string; active: boolean }) {
  const c = active ? '#fff' : '#6a8a60';
  const icons: Record<string, ReactNode> = {
    gills: (
      <svg width={S} height={S} viewBox="0 0 20 20">
        <line x1="10" y1="4" x2="10" y2="16" stroke={c} strokeWidth="1.5" />
        <line x1="6" y1="5" x2="6" y2="16" stroke={c} strokeWidth="1" />
        <line x1="14" y1="5" x2="14" y2="16" stroke={c} strokeWidth="1" />
        <line x1="3" y1="7" x2="3" y2="16" stroke={c} strokeWidth="0.8" />
        <line x1="17" y1="7" x2="17" y2="16" stroke={c} strokeWidth="0.8" />
      </svg>
    ),
    pores: (
      <svg width={S} height={S} viewBox="0 0 20 20">
        {[4,8,12,16].map(y => [4,8,12,16].map(x => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" fill={c} />
        )))}
      </svg>
    ),
    teeth: (
      <svg width={S} height={S} viewBox="0 0 20 20">
        {[4,7,10,13,16].map(x => (
          <line key={x} x1={x} y1="4" x2={x} y2="14" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
        ))}
      </svg>
    ),
    none: (
      <svg width={S} height={S} viewBox="0 0 20 20">
        <path d="M3 14 Q10 12 17 14" fill="none" stroke={c} strokeWidth="1.5" />
      </svg>
    ),
  };
  return <>{icons[type]}</>;
}

function GillAttachIcon({ type, active }: { type: string; active: boolean }) {
  const c = active ? '#fff' : '#6a8a60';
  const icons: Record<string, ReactNode> = {
    free: (
      <svg width={S} height={S} viewBox="0 0 20 20">
        <line x1="10" y1="4" x2="10" y2="16" stroke={c} strokeWidth="2" />
        <line x1="4" y1="5" x2="8" y2="10" stroke={c} strokeWidth="1.2" />
        <line x1="16" y1="5" x2="12" y2="10" stroke={c} strokeWidth="1.2" />
      </svg>
    ),
    attached: (
      <svg width={S} height={S} viewBox="0 0 20 20">
        <line x1="10" y1="4" x2="10" y2="16" stroke={c} strokeWidth="2" />
        <line x1="4" y1="5" x2="10" y2="10" stroke={c} strokeWidth="1.2" />
        <line x1="16" y1="5" x2="10" y2="10" stroke={c} strokeWidth="1.2" />
      </svg>
    ),
    decurrent: (
      <svg width={S} height={S} viewBox="0 0 20 20">
        <line x1="10" y1="4" x2="10" y2="16" stroke={c} strokeWidth="2" />
        <line x1="4" y1="5" x2="10" y2="13" stroke={c} strokeWidth="1.2" />
        <line x1="16" y1="5" x2="10" y2="13" stroke={c} strokeWidth="1.2" />
      </svg>
    ),
    sinuate: (
      <svg width={S} height={S} viewBox="0 0 20 20">
        <line x1="10" y1="4" x2="10" y2="16" stroke={c} strokeWidth="2" />
        <path d="M4 5 Q7 12 10 10" fill="none" stroke={c} strokeWidth="1.2" />
        <path d="M16 5 Q13 12 10 10" fill="none" stroke={c} strokeWidth="1.2" />
      </svg>
    ),
  };
  return <>{icons[type]}</>;
}

function ColorDot({ color, active }: { color: string; active: boolean }) {
  const colors: Record<string, string> = {
    white: '#f0f0f0', brown: '#8B4513', red: '#DC2626',
    yellow: '#EAB308', orange: '#EA580C', gray: '#9CA3AF', black: '#1f1f1f',
  };
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full border ${active ? 'border-white' : 'border-forest-600'}`}
      style={{ backgroundColor: colors[color] ?? '#888' }}
    />
  );
}

function StalkFeatureIcon({ type, active }: { type: string; active: boolean }) {
  const c = active ? '#fff' : '#6a8a60';
  const icons: Record<string, ReactNode> = {
    ring: (
      <svg width={S} height={S} viewBox="0 0 20 20">
        <line x1="10" y1="2" x2="10" y2="18" stroke={c} strokeWidth="2.5" />
        <ellipse cx="10" cy="8" rx="5" ry="1.5" fill="none" stroke={c} strokeWidth="1.2" />
      </svg>
    ),
    volva: (
      <svg width={S} height={S} viewBox="0 0 20 20">
        <line x1="10" y1="2" x2="10" y2="16" stroke={c} strokeWidth="2.5" />
        <path d="M5 14 Q10 18 15 14" fill="none" stroke={c} strokeWidth="1.2" />
      </svg>
    ),
    hollow: (
      <svg width={S} height={S} viewBox="0 0 20 20">
        <rect x="7" y="2" width="6" height="16" rx="1" fill="none" stroke={c} strokeWidth="1.5" />
      </svg>
    ),
    fibrous: (
      <svg width={S} height={S} viewBox="0 0 20 20">
        <line x1="8" y1="2" x2="8" y2="18" stroke={c} strokeWidth="1" />
        <line x1="10" y1="2" x2="10" y2="18" stroke={c} strokeWidth="1" />
        <line x1="12" y1="2" x2="12" y2="18" stroke={c} strokeWidth="1" />
      </svg>
    ),
  };
  return <>{icons[type]}</>;
}

// --- ChipGroup ---

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
        {options.map(({ value, label: chipLabel, iconFn }) => {
          const isActive = selected === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(isActive ? undefined : value)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs border transition-colors ${
                isActive
                  ? 'bg-forest-500 text-white border-forest-400'
                  : 'bg-forest-900 text-forest-400 border-forest-700 hover:border-forest-500'
              }`}
            >
              {iconFn && iconFn(isActive)}
              {chipLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const T = UI_TEXT.identify;

const REQUIRED_GROUPS: { key: keyof IdentifyInput; label: string; icon: string; options: ChipOption[] }[] = [
  {
    key: 'gill_type', label: T.gillType, icon: '🔬',
    options: [
      { value: 'gills', label: T.gillTypeGills, iconFn: (a) => <GillTypeIcon type="gills" active={a} /> },
      { value: 'pores', label: T.gillTypePores, iconFn: (a) => <GillTypeIcon type="pores" active={a} /> },
      { value: 'teeth', label: T.gillTypeTeeth, iconFn: (a) => <GillTypeIcon type="teeth" active={a} /> },
      { value: 'none', label: T.gillTypeNone, iconFn: (a) => <GillTypeIcon type="none" active={a} /> },
    ],
  },
  {
    key: 'cap_color', label: T.capColor, icon: '🎨',
    options: [
      { value: 'white', label: T.colorWhite, iconFn: (a) => <ColorDot color="white" active={a} /> },
      { value: 'brown', label: T.colorBrown, iconFn: (a) => <ColorDot color="brown" active={a} /> },
      { value: 'red', label: T.colorRed, iconFn: (a) => <ColorDot color="red" active={a} /> },
      { value: 'yellow', label: T.colorYellow, iconFn: (a) => <ColorDot color="yellow" active={a} /> },
      { value: 'orange', label: T.colorOrange, iconFn: (a) => <ColorDot color="orange" active={a} /> },
      { value: 'gray', label: T.colorGray, iconFn: (a) => <ColorDot color="gray" active={a} /> },
      { value: 'black', label: T.colorBlack, iconFn: (a) => <ColorDot color="black" active={a} /> },
    ],
  },
  {
    key: 'cap_shape', label: T.capShape, icon: '🍄',
    options: [
      { value: 'flat', label: T.shapeFlat, iconFn: (a) => <CapShapeIcon shape="flat" active={a} /> },
      { value: 'convex', label: T.shapeConvex, iconFn: (a) => <CapShapeIcon shape="convex" active={a} /> },
      { value: 'funnel', label: T.shapeFunnel, iconFn: (a) => <CapShapeIcon shape="funnel" active={a} /> },
      { value: 'hemisphere', label: T.shapeHemisphere, iconFn: (a) => <CapShapeIcon shape="hemisphere" active={a} /> },
      { value: 'conical', label: T.shapeConical, iconFn: (a) => <CapShapeIcon shape="conical" active={a} /> },
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
      { value: 'free', label: T.attachFree, iconFn: (a) => <GillAttachIcon type="free" active={a} /> },
      { value: 'attached', label: T.attachAttached, iconFn: (a) => <GillAttachIcon type="attached" active={a} /> },
      { value: 'decurrent', label: T.attachDecurrent, iconFn: (a) => <GillAttachIcon type="decurrent" active={a} /> },
      { value: 'sinuate', label: T.attachSinuate, iconFn: (a) => <GillAttachIcon type="sinuate" active={a} /> },
    ],
  },
  {
    key: 'stalk_color', label: T.stalkColor, icon: '🎨',
    options: [
      { value: 'white', label: T.colorWhite, iconFn: (a) => <ColorDot color="white" active={a} /> },
      { value: 'brown', label: T.colorBrown, iconFn: (a) => <ColorDot color="brown" active={a} /> },
      { value: 'yellow', label: T.colorYellow, iconFn: (a) => <ColorDot color="yellow" active={a} /> },
      { value: 'gray', label: T.colorGray, iconFn: (a) => <ColorDot color="gray" active={a} /> },
    ],
  },
  {
    key: 'stalk_features', label: T.stalkFeatures, icon: '🔧',
    options: [
      { value: 'ring', label: T.featureRing, iconFn: (a) => <StalkFeatureIcon type="ring" active={a} /> },
      { value: 'volva', label: T.featureVolva, iconFn: (a) => <StalkFeatureIcon type="volva" active={a} /> },
      { value: 'hollow', label: T.featureHollow, iconFn: (a) => <StalkFeatureIcon type="hollow" active={a} /> },
      { value: 'fibrous', label: T.featureFibrous, iconFn: (a) => <StalkFeatureIcon type="fibrous" active={a} /> },
    ],
  },
  {
    key: 'bruising', label: T.bruising, icon: '🩹',
    options: [
      { value: 'blue', label: T.bruisingBlue, iconFn: (a) => <ColorDot color={a ? 'white' : 'gray'} active={a} /> },
      { value: 'red', label: T.bruisingRed, iconFn: (a) => <ColorDot color="red" active={a} /> },
      { value: 'yellow', label: T.bruisingYellow, iconFn: (a) => <ColorDot color="yellow" active={a} /> },
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
