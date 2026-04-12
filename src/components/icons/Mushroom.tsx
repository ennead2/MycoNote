import * as React from 'react';

interface MushroomIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
}

/**
 * lucide-react スタイル互換の独自キノコアイコン。
 * lucide には mushroom アイコンが無いため、24x24 viewBox・stroke-based・
 * strokeLinecap/Linejoin round で揃えた SVG を自前で持つ。
 *
 * 構成: カサ上部の曲線 + ヒダの仕切り線 + 柄 + カサの斑点×2
 */
export const Mushroom = React.forwardRef<SVGSVGElement, MushroomIconProps>(
  ({ size = 24, strokeWidth = 2, className, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
      >
        {/* カサ: 半ドーム */}
        <path d="M3 13a9 9 0 0 1 18 0v1H3z" />
        {/* 柄 */}
        <path d="M10 14v5a2 2 0 0 0 4 0v-5" />
        {/* 斑点 */}
        <circle cx="9" cy="9" r="0.6" fill="currentColor" />
        <circle cx="15" cy="7.5" r="0.6" fill="currentColor" />
      </svg>
    );
  }
);

Mushroom.displayName = 'Mushroom';
