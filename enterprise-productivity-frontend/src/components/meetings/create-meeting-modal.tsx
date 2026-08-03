'use client';

import {
  cloneElement,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useAuth } from '@clerk/nextjs';
import { createMeeting, type MeetingItem, type MeetingPayload } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { IconCalendar } from '@/components/ui/icons';
import { MeetingForm } from './meeting-form';

export function CreateMeetingModal({
  onCreated,
  trigger,
}: {
  onCreated: (m: MeetingItem) => void;
  trigger?: ReactNode;
}) {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(payload: MeetingPayload) {
    setIsSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
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

  const defaultTrigger = (
    <Button size="sm">
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
        <MeetingForm isSubmitting={isSubmitting} error={error} submitLabel="Create" onSubmit={handleSubmit} onCancel={() => setIsOpen(false)} />
      </Modal>
    </>
  );
}
