'use client';

import {
  cloneElement,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useAuth } from '@/lib/auth';
import {
  createMeeting,
  createCreationRequest,
  type MeetingItem,
  type MeetingPayload,
  type CreationRequestItem,
} from '@/lib/api-client';
import { useRole } from '@/hooks/use-role';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { IconCalendar } from '@/components/ui/icons';
import { MeetingForm } from './meeting-form';

export function CreateMeetingModal({
  onCreated,
  trigger,
}: {
  onCreated: (item: MeetingItem | CreationRequestItem) => void;
  trigger?: ReactNode;
}) {
  const { getToken } = useAuth();
  const { can } = useRole();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(payload: MeetingPayload) {
    setIsSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve session token.');

      if (!can('create_meeting')) {
        const request = await createCreationRequest(token, {
          entityType: 'meeting',
          payload,
        });
        showToast('Meeting request submitted — a team lead will review it.');
        onCreated(request);
        setIsOpen(false);
        return;
      }

      const meeting = await createMeeting(token, payload);
      showToast('Meeting created.');
      onCreated(meeting);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create meeting.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const requiresApproval = !can('create_meeting');
  const defaultTrigger = (
    <Button size="sm" onClick={() => setIsOpen(true)}>
      <IconCalendar width={15} height={15} /> New Meeting
    </Button>
  );

  return (
    <>
      {trigger && isValidElement(trigger)
        ? cloneElement(trigger as ReactElement<{ onClick?: () => void }>, {
            onClick: () => setIsOpen(true),
          })
        : defaultTrigger}
      <Modal open={isOpen} onClose={() => setIsOpen(false)} title="New Meeting">
        {requiresApproval && (
          <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            Your meeting will be sent to a team lead for approval before it is
            scheduled.
          </div>
        )}
        <MeetingForm
          isSubmitting={isSubmitting}
          error={error}
          submitLabel={requiresApproval ? 'Submit for approval' : 'Create'}
          onSubmit={handleSubmit}
          onCancel={() => setIsOpen(false)}
        />
      </Modal>
    </>
  );
}