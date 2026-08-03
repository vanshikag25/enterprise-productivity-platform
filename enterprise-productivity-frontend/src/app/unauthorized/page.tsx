import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-4xl font-bold text-gray-300">403</p>
      <p className="text-sm text-gray-500">You don&apos;t have permission to view this page.</p>
      <Link href="/dashboard" className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
        Back to Chat
      </Link>
    </div>
  );
}
