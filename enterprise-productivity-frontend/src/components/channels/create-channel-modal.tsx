'use client';

import {
  cloneElement,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useAuth } from '@/lib/auth';
import { createChannel, type ChannelSummary, type UserDirectoryItem } from '@/lib/api-client';
import { GroupMemberPicker } from '@/components/chat/group-member-picker';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input, Label, Textarea } from '@/components/ui/form';
import { IconPlus } from '@/components/ui/icons';

interface CreateChannelModalProps {
  kind: 'organization' | 'announcement';
  onCreated: (c: ChannelSummary) => void;
  trigger?: ReactNode;
}

export function CreateChannelModal({ kind, onCreated, trigger }: CreateChannelModalProps) {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<UserDirectoryItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName('');
    setDescription('');
    setMembers([]);
    setError(null);
  }

  async function handleSubmit() {
    if (!name.trim()) return setError('Name is required.');
    setIsSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const channel = await createChannel(token, { kind, name: name.trim(), description: description.trim() || undefined, memberIds: members.map((m) => m.id) });
      showToast(`${kind === 'announcement' ? 'Announcement channel' : 'Channel'} created.`);
      onCreated(channel);
      setIsOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create channel.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const defaultTrigger = (
    <Button size="sm">
      <IconPlus width={15} height={15} />
      {kind === 'announcement' ? 'New Announcement Channel' : 'New Channel'}
    </Button>
  );

  return (
    <>
      {trigger && isValidElement(trigger)
        ? cloneElement(trigger as ReactElement<{ onClick?: () => void }>, {
            onClick: () => setIsOpen(true),
          })
        : defaultTrigger}
      <Modal open={isOpen} onClose={() => setIsOpen(false)} title={`New ${kind === 'announcement' ? 'Announcement Channel' : 'Channel'}`}>
        <div className="flex flex-col gap-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Channel name" autoFocus />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What is this channel for? (optional)" />
          </div>
          <div>
            <Label>Members</Label>
            <GroupMemberPicker selectedUsers={members} onChange={setMembers} />
          </div>
          {error && <p className="field-error">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
