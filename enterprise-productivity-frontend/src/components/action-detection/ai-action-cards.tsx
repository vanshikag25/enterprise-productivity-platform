'use client';

import { useMemo } from 'react';
import { useRole } from '@/hooks/use-role';
import { useMessageActionModalHost } from '@/components/message-actions/message-action-modal-host';
import { useAIActionDetection } from './action-detection-context';
import type { AiDetectedIntent, DetectedActionItem } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  IconCalendarPlus,
  IconCheckCircle,
  IconClock,
  IconClose,
  IconSparkles,
  IconTasks,
} from '@/components/ui/icons';

interface CardActionPlan {
  label: string;
  modalType: 'createTask' | 'createEvent' | 'createReminder' | null;
  entityType: string;
  prefill: Record<string, unknown>;
  requiresRole: boolean;
}

const INTENT_LABEL: Record<AiDetectedIntent, string> = {
  task: 'Suggested task',
  deadline: 'Deadline detected',
  meeting: 'Meeting requested',
  reminder: 'Reminder suggested',
  decision: 'Decision detected',
  follow_up: 'Follow-up suggested',
};

function toLocalDateTimeValue(dateString?: string | null): string | undefined {
  if (!dateString) return undefined;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildPlan(action: DetectedActionItem): CardActionPlan {
  const meta = action.meta ?? {};
  const summary =
    action.summary ??
    (typeof meta.description === 'string' ? meta.description : undefined) ??
    action.sourceMessageText ??
    '';

  switch (action.intentType) {
    case 'task':
    case 'deadline':
      return {
        label: 'Create task',
        modalType: 'createTask',
        entityType: 'task',
        requiresRole: true,
        prefill: {
          title: action.title,
          description: summary || undefined,
          ...(typeof meta.dueDate === 'string'
            ? { dueDate: meta.dueDate }
            : {}),
        },
      };
    case 'meeting':
      return {
        label: 'Schedule meeting',
        modalType: 'createEvent',
        entityType: 'meeting',
        requiresRole: true,
        prefill: {
          title: action.title,
          description: summary || undefined,
          ...(typeof meta.scheduledDate === 'string'
            ? { scheduledDate: meta.scheduledDate }
            : {}),
          ...(typeof meta.startTime === 'string'
            ? { startTime: meta.startTime }
            : {}),
          ...(typeof meta.endTime === 'string' ? { endTime: meta.endTime } : {}),
        },
      };
    case 'reminder':
    case 'follow_up':
      return {
        label: 'Set reminder',
        modalType: 'createReminder',
        entityType: 'reminder',
        requiresRole: false,
        prefill: {
          title: action.title,
          scheduledFor: toLocalDateTimeValue(
            typeof meta.scheduledFor === 'string'
              ? meta.scheduledFor
              : undefined,
          ),
          ...(summary ? { notes: summary } : {}),
        },
      };
    case 'decision':
      return {
        label: 'Record decision',
        modalType: null,
        entityType: 'decision',
        requiresRole: false,
        prefill: {},
      };
  }
}

function ActionCardIcon({ intent }: { intent: AiDetectedIntent }) {
  switch (intent) {
    case 'meeting':
      return <IconCalendarPlus width={14} height={14} />;
    case 'reminder':
    case 'follow_up':
      return <IconClock width={14} height={14} />;
    case 'decision':
      return <IconCheckCircle width={14} height={14} />;
    default:
      return <IconTasks width={14} height={14} />;
  }
}

function AiActionCard({ action }: { action: DetectedActionItem }) {
  const { dismiss, resolveDirect, removeAction } = useAIActionDetection();
  const { can } = useRole();
  const { openModal } = useMessageActionModalHost();

  const plan = useMemo(() => buildPlan(action), [action]);
  const canCreateDirectly =
    !plan.requiresRole || can(plan.entityType as 'create_task' | 'create_meeting');

  const confidence = action.confidence != null
    ? `${Math.round(action.confidence * 100)}%`
    : null;

  function handlePrimary() {
    if (plan.modalType === null) {
      void resolveDirect(action, `Decision recorded: ${action.title}`);
      return;
    }
    openModal(plan.modalType, {
      sourceChannelId: action.channelId,
      sourceMessageId: action.messageId,
      sourceSenderId: action.senderId ?? undefined,
      sourceChannelName: action.channelName ?? undefined,
      sourceMessageText: action.sourceMessageText ?? undefined,
    }, {
      actionId: action.id,
      prefill: plan.prefill,
      onResolved: () => removeAction(action.id),
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <ActionCardIcon intent={action.intentType} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 text-xs font-semibold text-amber-900">
            <span>{INTENT_LABEL[action.intentType]}</span>
            {confidence && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                {confidence}
              </span>
            )}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
            {action.title}
          </p>
          {action.summary && (
            <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
              {action.summary}
            </p>
          )}
        </div>
        <button
          onClick={() => void dismiss(action.id)}
          aria-label="Dismiss suggestion"
          className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-amber-100 hover:text-slate-600"
        >
          <IconClose width={13} height={13} />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={handlePrimary} className="gap-1.5">
          <IconSparkles width={13} height={13} />
          {plan.label}
        </Button>
        {!canCreateDirectly && (
          <span className="text-[11px] text-slate-400">
            Will be sent to a team lead for approval.
          </span>
        )}
      </div>
    </div>
  );
}

export function AiActionCards({ messageId }: { messageId?: string }) {
  const { getActionsForMessage, analyzingIds } = useAIActionDetection();
  const actions = messageId ? getActionsForMessage(messageId) : [];

  if (!actions.length) {
    if (messageId && analyzingIds.includes(messageId)) {
      return (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 px-3 py-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-slate-300" />
          <span className="text-[11px] text-slate-400">
            Detecting actions…
          </span>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5 px-2 pt-1">
      {actions.map((action) => (
        <AiActionCard key={action.id} action={action} />
      ))}
    </div>
  );
}