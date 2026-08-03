import { Spinner } from '@/components/ui/spinner';

export default function Loading() {
  return (
    <div className="flex h-[60vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <Spinner size={30} className="text-blue-600" />
        <p className="text-sm">Loading…</p>
      </div>
    </div>
  );
}
