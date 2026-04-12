interface ColorChipProps {
  /** Hex color value to display */
  color: string;
  /** Accessible label (color name) */
  label: string;
  /** Size: sm for inline use (8px), md for labeled rows (12px) */
  size?: 'sm' | 'md' | 'lg';
  /** Shape: circle (default) or square */
  shape?: 'circle' | 'square';
  className?: string;
}

/**
 * Small visual indicator chip showing an actual color.
 * Used for species color attributes (cap/gill/stem color etc.)
 * to give users an immediate visual read of color names.
 */
export function ColorChip({
  color,
  label,
  size = 'sm',
  shape = 'circle',
  className = '',
}: ColorChipProps) {
  const sizeClass = size === 'sm' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4';
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-sm';

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-block shrink-0 ${sizeClass} ${shapeClass} border border-washi-cream/15 align-middle ${className}`}
      style={{
        backgroundColor: color,
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)',
      }}
    />
  );
}
