'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRole } from '@/hooks/use-role';
import { useToast } from '@/hooks/use-toast';
import {
  fetchCreationRequests,
  approveCreationRequest,
  rejectCreationRequest,
  type CreationRequestEntityType,
  type CreationRequestItem,
} from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconCheck, IconClose, IconClock, IconTasks, IconCalendar } from '@/components/ui/icons';

const STATUS_VARIANT: Record<string, 'amber' | 'green' | 'red'> = {
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

interface CreationRequestsSectionProps {
  entityType: CreationRequestEntityType;
  /** Called when an approval creates a real entity so the page can refresh. */
  onEntityCreated?: () => void;
}

/**
 * Lists creation requests for a given entity type. Team leads can approve or
 * reject the pending ones; everyone else sees their own submissions and their
 * current status.
 */
export function CreationRequestsSection({
  entityType,
  onEntityCreated,
}: CreationRequestsSectionProps) {
  const { getToken } = useAuth();
  const { can } = useRole();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<CreationRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const items = await fetchCreationRequests(token, entityType);
      setRequests(items);
    } catch {
      // Best-effort — the section hides itself when nothing is available.
    } finally {
      setIsLoading(false);
    }
  }, [getToken, entityType]);

  useEffect(() => {
    void load();
  }, [load]);

  const isApprover =
    can(entityType === 'meeting' ? 'create_meeting' : 'create_task');

  const pending = requests.filter((r) => r.status === 'pending');
  const reviewed = requests.filter((r) => r.status !== 'pending');

  if (!isLoading && requests.length === 0) return null;

  async function handleApprove(request: CreationRequestItem) {
    setBusyId(request.id);
    try {
      const token = await getToken();
      if (!token) return;
      await approveCreationRequest(token, request.id);
      showToast(
        `${request.entityType === 'meeting' ? 'Meeting' : 'Task'} approved and created.`,
      );
      onEntityCreated?.();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to approve request.',
        'error',
      );
    } finally {
      setBusyId(null);
      await load();
    }
  }

  async function handleReject(request: CreationRequestItem) {
    setBusyId(request.id);
    try {
      const token = await getToken();
      if (!token) return;
      await rejectCreationRequest(token, request.id);
      showToast(
        `${request.entityType === 'meeting' ? 'Meeting' : 'Task'} request declined.`,
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to reject request.',
        'error',
      );
    } finally {
      setBusyId(null);
      await load();
    }
  }

  const Icon = entityType === 'meeting' ? IconCalendar : IconTasks;

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <Icon width={15} height={15} className="text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-700">
          {isApprover ? 'Requests awaiting approval' : 'My requests'}
        </h2>
        {pending.length > 0 && isApprover && (
          <Badge variant="amber">{pending.length} pending</Badge>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 px-4 py-3">
          <IconClock width={14} height={14} className="text-slate-400" />
          <span className="text-xs text-slate-400">Loading requests…</span>
        </div>
      )}

      {!isLoading && pending.length === 0 && reviewed.length === 0 && (
        <p className="px-4 py-3 text-xs text-slate-400">
          No requests to show.
        </p>
      )}

      {!isLoading && (pending.length > 0 || reviewed.length > 0) && (
        <div className="divide-y divide-slate-100">
          {[...pending, ...reviewed].map((request) => {
            const due = request.payload.dueDate as string | undefined;
            const scheduled = request.payload.scheduledDate as string | undefined;
            const meta =
              request.entityType === 'meeting'
                ? scheduled
                  ? `${new Date(scheduled).toLocaleDateString()} · ${String(
                      request.payload.startTime ?? '',
                    )}–${String(request.payload.endTime ?? '')}`
                  : undefined
                : due
                  ? `Due ${new Date(due).toLocaleDateString()}`
                  : undefined;

            return (
              <div
                key={request.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800">
                    {request.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {request.createdById}
                    {meta ? ` · ${meta}` : ''}
                    {request.reviewNote ? ` · ${request.reviewNote}` : ''}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[request.status] ?? 'gray'}>
                  {STATUS_LABEL[request.status] ?? request.status}
                </Badge>
                {request.status === 'pending' && isApprover && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="success"
                      disabled={busyId === request.id}
                      onClick={() => void handleApprove(request)}
                      className="gap-1"
                    >
                      <IconCheck width={13} height={13} /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === request.id}
                      onClick={() => void handleReject(request)}
                      className="gap-1"
                    >
                      <IconClose width={13} height={13} /> Reject
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}