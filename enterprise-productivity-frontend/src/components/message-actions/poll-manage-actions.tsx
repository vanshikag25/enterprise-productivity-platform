'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  PollContent,
  useChannelStateContext,
  usePollContext,
  useStateStore,
} from 'stream-chat-react';
import type { Event, PollState } from 'stream-chat';
import { closePoll, deletePoll, finalizePoll } from '@/lib/api-client';
import { useRole } from '@/hooks/use-role';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { IconEdit, IconTrash } from '@/components/ui/icons';
import { PollFormModal } from '@/components/polls/poll-form-modal';

const pollStateSelector = (state: PollState) => ({
  name: state.name,
  is_closed: state.is_closed,
  created_by_id: state.created_by_id,
  options: state.options,
});

export function PollContentWithManage() {
  return (
    <>
      <PollContent />
      <PollManageRow />
    </>
  );
}

function PollManageRow() {
  const { poll } = usePollContext();
  const { channel } = useChannelStateContext();
  const { getToken, userId } = useAuth();
  const { hasRole } = useRole();
  const { showToast } = useToast();

  const state = useStateStore(poll.state, pollStateSelector);
  const [showEdit, setShowEdit] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const isCreator = state.created_by_id === userId;
  const canManage = isCreator || hasRole('manager');
  const isClosed = Boolean(state.is_closed);

  const finalizedRef = useRef(false);

  useEffect(() => {
    if (!channel) return;
    const handlePollClosed = (event: Event) => {
      if (event.poll?.id !== poll.id) return;
      if (finalizedRef.current) return;
      finalizedRef.current = true;
      void (async () => {
        const token = await getToken();
        if (!token) return;
        try {
          await finalizePoll(token, poll.id);
        } catch {
          finalizedRef.current = false;
        }
      })();
    };
    channel.on('poll.closed', handlePollClosed);
    return () => {
      channel.off('poll.closed', handlePollClosed);
    };
  }, [channel, poll.id, getToken]);

  async function runApi(action: (token: string) => Promise<unknown>, successMessage: string) {
    const token = await getToken();
    if (!token) {
      showToast('Unable to retrieve Clerk session token.', 'error');
      return;
    }
    setIsBusy(true);
    try {
      await action(token);
      showToast(successMessage);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Something went wrong.', 'error');
    } finally {
      setIsBusy(false);
    }
  }

  if (!canManage) return null;

  return (
    <>
      {!isClosed && (
        <div className="mt-2 flex flex-wrap gap-2">
          {isCreator && (
            <Button size="sm" variant="outline" onClick={() => setShowEdit(true)} disabled={isBusy}>
              <IconEdit width={14} height={14} />
              Edit poll
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => runApi((token) => closePoll(token, poll.id), 'Poll closed.')} disabled={isBusy}>
            Close poll
          </Button>
        </div>
      )}
      <div className="mt-2">
        <Button size="sm" variant="danger" onClick={() => runApi((token) => deletePoll(token, poll.id), 'Poll deleted.')} disabled={isBusy}>
          <IconTrash width={14} height={14} />
          Delete poll
        </Button>
      </div>
      {showEdit && (
        <PollFormModal
          open
          onClose={() => setShowEdit(false)}
          mode="edit"
          streamPollId={poll.id}
          initialQuestion={state.name}
          initialOptions={state.options.map((option) => option.text)}
        />
      )}
    </>
  );
}
