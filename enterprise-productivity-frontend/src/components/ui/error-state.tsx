import { Button } from './button';
import { IconAlertTriangle } from './icons';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50/60 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
        <IconAlertTriangle width={24} height={24} />
      </div>
      <div>
        <p className="text-sm font-semibold text-red-700">Something went wrong</p>
        <p className="mt-1 max-w-sm text-xs text-red-600/80">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
