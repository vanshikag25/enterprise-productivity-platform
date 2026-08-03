'use client';

import {
  cloneElement,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useAuth } from '@clerk/nextjs';
import { createProject, type ProjectItem } from '@/lib/projects-api';
import type { UserDirectoryItem } from '@/lib/api-client';
import { GroupMemberPicker } from '@/components/chat/group-member-picker';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input, Label, Textarea } from '@/components/ui/form';
import { IconPlus } from '@/components/ui/icons';

interface CreateProjectModalProps {
  onCreated: (project: ProjectItem) => void;
  trigger?: ReactNode;
}

export function CreateProjectModal({ onCreated, trigger }: CreateProjectModalProps) {
  const { getToken } = useAuth();
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<UserDirectoryItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetAndClose() {
    setIsOpen(false);
    setName('');
    setDescription('');
    setAvatarUrl('');
    setSelectedUsers([]);
    setError(null);
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');

      const project = await createProject(token, {
        name: name.trim(),
        description: description.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        memberIds: selectedUsers.map((u) => u.id),
      });

      showToast('Project created.');
      onCreated(project);
      resetAndClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const defaultTrigger = (
    <Button size="sm">
      <IconPlus width={15} height={15} /> New Project
    </Button>
  );

  return (
    <>
      {trigger && isValidElement(trigger)
        ? cloneElement(trigger as ReactElement<{ onClick?: () => void }>, {
            onClick: () => setIsOpen(true),
          })
        : defaultTrigger}
      <Modal open={isOpen} onClose={resetAndClose} title="New Project">
        <div className="flex flex-col gap-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" autoFocus />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What is this project about?" />
          </div>
          <div>
            <Label>Avatar image URL (optional)</Label>
            <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://example.com/avatar.png" />
          </div>
          <div>
            <Label>Members</Label>
            <GroupMemberPicker selectedUsers={selectedUsers} onChange={setSelectedUsers} />
          </div>
          {error && <p className="field-error">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : `Create Project (${selectedUsers.length + 1} members)`}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
