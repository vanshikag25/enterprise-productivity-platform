import { Spinner } from '@/components/ui/spinner';

export function AuthCardSkeleton() {
  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-popover">
      <div className="skeleton mx-auto mb-6 h-8 w-40" />
      <div className="skeleton h-10 w-full" />
      <div className="skeleton mt-3 h-10 w-full" />
      <div className="skeleton mt-6 h-11 w-full" />
      <div className="mt-6 flex items-center justify-center gap-2 text-slate-400">
        <Spinner size={16} />
        <span className="text-xs">Loading…</span>
      </div>
    </div>
  );
}
