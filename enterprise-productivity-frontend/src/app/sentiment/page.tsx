'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRole } from '@/hooks/use-role';
import { listProjects, type ProjectItem } from '@/lib/projects-api';
import {
  analyzeSentiment,
  fetchSentimentStatus,
  setSentimentStatus,
  type SentimentAnalysisResponse,
  type SentimentInsight,
  type SentimentTrendPoint,
} from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { SkeletonList } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  IconClock,
  IconInfo,
  IconLock,
  IconMessageCircle,
  IconProject,
  IconSparkles,
} from '@/components/ui/icons';

const DAY_OPTIONS = [7, 14, 30, 90];

const CATEGORY_META: Record<
  string,
  { label: string; variant: 'green' | 'amber' | 'red' }
> = {
  positive: { label: 'Positive', variant: 'green' },
  frustration: { label: 'Frustration', variant: 'amber' },
  blocker: { label: 'Blocker', variant: 'red' },
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function InsightRow({ insight }: { insight: SentimentInsight }) {
  const meta = CATEGORY_META[insight.category] ?? CATEGORY_META.neutral;
  return (
    <button
      onClick={() => insight.url && window.location.assign(insight.url)}
      className="flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
    >
      <Avatar
        name={insight.userName ?? insight.userId ?? 'Unknown'}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-medium text-slate-800">
            {insight.userName ?? insight.userId ?? 'Unknown'}
          </span>
          {insight.createdAt && (
            <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
              <IconClock width={12} height={12} />
              {formatDate(insight.createdAt)} · {formatTime(insight.createdAt)}
            </span>
          )}
        </div>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-700">
          {insight.text}
        </p>
      </div>
      <Badge variant={meta.variant}>{meta.label}</Badge>
    </button>
  );
}

function InsightSection({
  title,
  description,
  insights,
  emptyText,
  accent,
}: {
  title: string;
  description: string;
  insights: SentimentInsight[];
  emptyText: string;
  accent: 'green' | 'amber' | 'red';
}) {
  return (
    <section className="card">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
        <Badge variant={accent}>{insights.length}</Badge>
      </div>
      {insights.length === 0 ? (
        <div className="px-5 py-8 text-center text-xs text-slate-400">
          {emptyText}
        </div>
      ) : (
        <div className="data-list">
          {insights.slice(0, 5).map((insight) => (
            <InsightRow key={insight.messageId} insight={insight} />
          ))}
        </div>
      )}
    </section>
  );
}

function TrendChart({ points }: { points: SentimentTrendPoint[] }) {
  const max = Math.max(1, ...points.flatMap((p) => [p.positive, p.frustration]));
  return (
    <div className="space-y-2">
      {points.map((point) => (
        <div key={point.date} className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-xs text-slate-500">
            {new Date(point.date).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <div className="flex h-5 flex-1 gap-px overflow-hidden rounded">
            {point.positive > 0 && (
              <div
                className="bg-emerald-500"
                style={{ width: `${(point.positive / max) * 100}%` }}
                title={`${point.positive} positive`}
              />
            )}
            {point.frustration > 0 && (
              <div
                className="bg-amber-500"
                style={{ width: `${(point.frustration / max) * 100}%` }}
                title={`${point.frustration} frustration`}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SentimentPage() {
  const { getToken } = useAuth();
  const role = useRole();

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [days, setDays] = useState(14);
  const [analysis, setAnalysis] = useState<SentimentAnalysisResponse | null>(null);
  const [analysisKey, setAnalysisKey] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Unable to retrieve session token.');
        const [status, projectList] = await Promise.all([
          fetchSentimentStatus(token),
          listProjects(token),
        ]);
        if (cancelled) return;
        setEnabled(status.enabled);
        setProjects(projectList);
        if (projectList.length > 0 && !selectedProjectId) {
          setSelectedProjectId(projectList[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load sentiment settings.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken]);

  const currentKey = selectedProjectId ? `${selectedProjectId}|${days}` : null;

  useEffect(() => {
    if (
      !enabled ||
      !selectedProjectId ||
      !currentKey ||
      analysisKey === currentKey
    ) {
      return;
    }
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Unable to retrieve session token.');
        const result = await analyzeSentiment(token, selectedProjectId, days);
        if (cancelled) return;
        setAnalysis(result);
        setAnalysisKey(currentKey);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, selectedProjectId, days, currentKey, analysisKey]);

  if (role.isLoading) {
    return (
      <div className="page-container">
        <SkeletonList count={3} />
      </div>
    );
  }

  if (!role.role || !role.hasRole('manager')) {
    return (
      <div className="page-container">
        <EmptyState
          icon={<IconLock width={26} height={26} />}
          title="Restricted to managers"
          description="AI sentiment analysis is available to managers and above. Contact an administrator if you believe this is a mistake."
        />
      </div>
    );
  }

  if (error && analysis === null && enabled === null) {
    return (
      <div className="page-container">
        <PageHeader
          title="Team Sentiment"
          subtitle="AI-powered pulse check on morale, frustration, and blockers across project conversations."
          icon={<IconSparkles width={20} height={20} className="text-violet-500" />}
        />
        <ErrorState
          message={error}
          onRetry={() => {
            setError(null);
            setEnabled(null);
          }}
        />
      </div>
    );
  }

  async function handleToggle(next: boolean) {
    setIsToggling(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve session token.');
      const res = await setSentimentStatus(token, next);
      setEnabled(res.enabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update setting.');
    } finally {
      setIsToggling(false);
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Team Sentiment"
        subtitle="AI-powered pulse check on morale, frustration, and blockers across project conversations."
        icon={<IconSparkles width={20} height={20} className="text-violet-500" />}
        actions={
          enabled !== null && (
            <Button
              variant={enabled ? 'secondary' : 'success'}
              size="sm"
              disabled={isToggling}
              onClick={() => void handleToggle(!enabled)}
            >
              {isToggling ? (
                <Spinner size={14} />
              ) : enabled ? (
                'Disable'
              ) : (
                'Enable analysis'
              )}
            </Button>
          )
        }
      />

      {error && <ErrorState message={error} onRetry={() => setError(null)} />}

      {enabled === false && (
        <EmptyState
          icon={<IconMessageCircle width={26} height={26} />}
          title="Sentiment analysis is off"
description="When enabled, the AI reads recent project conversations and surfaces morale signals, frustration, and blockers for your team."
          action={
            <Button
              variant="success"
              size="sm"
              disabled={isToggling}
              onClick={() => void handleToggle(true)}
            >
              {isToggling ? <Spinner size={14} /> : 'Enable analysis'}
            </Button>
          }
        />
      )}

      {enabled === true && projects.length === 0 && (
        <EmptyState
          icon={<IconProject width={26} height={26} />}
          title="No projects yet"
          description="Analysis runs against project conversations. Create a project first, then come back here."
        />
      )}

      {enabled === true && projects.length > 0 && (
        <div className="card mb-6 p-5">
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">Project</span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                aria-label="Project"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">Window</span>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                aria-label="Analysis window"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {DAY_OPTIONS.map((day) => (
                  <option key={day} value={day}>
                    Last {day} days
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="danger"
              size="sm"
              disabled={isToggling}
              onClick={() => void handleToggle(false)}
            >
              Disable analysis
            </Button>
          </div>
        </div>
      )}

      {error && enabled === true && !isToggling && (
        <div className="mb-4">
          <ErrorState message={error} onRetry={() => setError(null)} />
        </div>
      )}

      {enabled === true &&
        selectedProjectId &&
        !analysis &&
        !error && <SkeletonList count={3} />}

      {enabled === true && analysis && analysis.insufficient && (
        <EmptyState
          icon={<IconInfo width={26} height={26} />}
          title="Not enough conversation data"
          description="The selected project had too few messages in the chosen time window to draw a reliable signal. Pick a wider window or a more active project."
        />
      )}

      {enabled === true && analysis && !analysis.insufficient && (
        <div className="space-y-6">
          <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Overall sentiment
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {analysis.project.name} · {analysis.analyzedCount} message
                  {analysis.analyzedCount === 1 ? '' : 's'} analyzed
                </p>
              </div>
              <Badge variant="violet">
                {analysis.provider === 'mock' ? 'offline AI' : analysis.provider}
              </Badge>
            </div>
            {analysis.overall ? (
              <div className="mt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-800">
                    {analysis.overall.label}
                  </span>
                  <span className="text-xs text-slate-400">
                    {Math.round(analysis.overall.score)} / 100
                  </span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={[
                      'h-full rounded-full transition-all',
                      analysis.overall.score >= 65
                        ? 'bg-emerald-500'
                        : analysis.overall.score >= 45
                          ? 'bg-amber-500'
                          : 'bg-red-500',
                    ].join(' ')}
                    style={{ width: `${analysis.overall.score}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                No overall score — showing individual signals only.
              </p>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <InsightSection
              title="Wins to celebrate"
              description="Recent positive feedback and shout-outs."
              insights={analysis.positives}
              emptyText="No positive signals in this window."
              accent="green"
            />
          </div>

          <InsightSection
            title="Frustrations"
            description="Sources of friction the team is calling out."
            insights={analysis.frustrations}
            emptyText="No frustration signals in this window."
            accent="amber"
          />

          <InsightSection
            title="Blockers detected"
            description="Messages flagging something that is stalling progress."
            insights={analysis.blockers}
            emptyText="No blockers detected in this window."
            accent="red"
          />

          <section className="card p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-800">Trend</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Daily positive vs. frustration messages in the window.
              </p>
            </div>
            <div className="mb-2 flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                Positive
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                Frustration
              </span>
            </div>
            {analysis.trend.length === 0 ? (
              <p className="text-xs text-slate-400">No trend data yet.</p>
            ) : (
              <TrendChart points={analysis.trend} />
            )}
          </section>
        </div>
      )}
    </div>
  );
}