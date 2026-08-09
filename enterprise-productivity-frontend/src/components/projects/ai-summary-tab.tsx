'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { fetchAiSummary, type AiSummary } from '@/lib/projects-api';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';

interface AiSummaryTabProps {
  projectId: string;
  projectName: string;
}

function Section({
  title,
  icon,
  items,
}: {
  title: string;
  icon: string;
  items: string[];
}) {
  return (
    <section className="rounded-lg border p-4">
      <h3 className="mb-2 text-sm font-semibold">
        <span aria-hidden="true" className="mr-1.5">
          {icon}
        </span>
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400">None detected.</p>
      ) : (
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-gray-700">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AiSummaryTab({ projectId, projectName }: AiSummaryTabProps) {
  const { getToken } = useAuth();

  const [summary, setSummary] = useState<AiSummary | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setIsGenerating(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      setSummary(await fetchAiSummary(token, projectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">AI Summary</h2>
            <p className="text-xs text-gray-400">
              A quick digest of recent project activity.
            </p>
          </div>
          <button
            onClick={generate}
            disabled={isGenerating}
            className="shrink-0 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {isGenerating ? 'Generating…' : summary ? 'Regenerate' : 'Generate summary'}
          </button>
        </div>

        {isGenerating && (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {!isGenerating && error && <ErrorState message={error} onRetry={generate} />}

        {!isGenerating && !error && !summary && (
          <>
            <EmptyState
              title="No summary yet"
              description={`Generate an AI summary of "${projectName}" to review recent activity at a glance.`}
            />
            <div className="flex justify-center">
              <button
                onClick={generate}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
              >
                Generate summary
              </button>
            </div>
          </>
        )}

        {!isGenerating && !error && summary && (
          <>
            <p className="whitespace-pre-wrap rounded-lg border p-4 text-sm leading-relaxed text-gray-700">
              {summary.overview}
            </p>
            <Section title="Key Decisions" icon="🧭" items={summary.keyDecisions} />
            <Section title="Action Items" icon="✅" items={summary.actionItems} />
            <Section title="Blockers" icon="🚧" items={summary.blockers} />

            <p className="text-xs text-gray-400">
              Generated {new Date(summary.generatedAt).toLocaleString()} by the{' '}
              {summary.provider} provider.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
