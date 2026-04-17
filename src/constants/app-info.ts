/**
 * ビルド時に next.config.ts 経由で注入される版情報。
 * - APP_VERSION: package.json の version（リリース時に手動 bump）
 * - APP_COMMIT: main push 時の commit SHA 先頭 7 文字（Vercel が自動注入）
 *
 * 静的 export なので、いずれも build 時に文字列として bundle に焼き込まれる。
 */
export const APP_VERSION: string = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';
export const APP_COMMIT: string = process.env.NEXT_PUBLIC_APP_COMMIT ?? 'dev';

/** 設定画面などで表示する統合ラベル。例: "v2.1.0 (a1b2c3d)" */
export const APP_VERSION_LABEL: string = `v${APP_VERSION} (${APP_COMMIT})`;
