import { UI_TEXT } from '@/constants/ui-text';

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8" role="status">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-forest-300 border-t-transparent" />
      <span className="sr-only">{UI_TEXT.common.loading}</span>
    </div>
  );
}
