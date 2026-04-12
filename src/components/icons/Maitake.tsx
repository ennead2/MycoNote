import * as React from 'react';

interface MaitakeIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
}

/**
 * マイタケ（Grifola frondosa）モチーフの独自アイコン。
 * Mushroom アイコン（汎用キノコ）と区別して、アシスタント発話のラベル等に
 * ブランド記号として使う。
 *
 * lucide-react スタイル互換（24x24 viewBox, stroke-based, round join）。
 * 構成:
 *   - 上部: 4連の波状カサ（マイタケ特有の舞い重なる襞）
 *   - 中段: 台形の房部（cluster）
 *   - 下部: 3本の柄（根元が束になる）
 */
export const Maitake = React.forwardRef<SVGSVGElement, MaitakeIconProps>(
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
        {/* 波状のカサ（舞い重なる襞） */}
        <path d="M3 12 Q5 7 7.5 12 Q9.5 7 12 12 Q14.5 7 16.5 12 Q19 7 21 12" />
        {/* 房（cluster）の側面 */}
        <path d="M3 12 L6 16" />
        <path d="M21 12 L18 16" />
        <path d="M6 16 L18 16" />
        {/* 3 本の柄 */}
        <path d="M9 16 V20" />
        <path d="M12 16 V20.5" />
        <path d="M15 16 V20" />
      </svg>
    );
  }
);

Maitake.displayName = 'Maitake';
