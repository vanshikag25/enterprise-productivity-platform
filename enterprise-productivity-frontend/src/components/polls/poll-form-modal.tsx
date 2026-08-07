'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { createPoll, updatePoll } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input, Label } from '@/components/ui/form';
import { IconClose, IconPlus } from '@/components/ui/icons';

const MAX_OPTIONS = 10;
const MIN_OPTIONS = 2;

function toLocalDateTimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface PollFormModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  channelId?: string;
  streamPollId?: string;
  initialQuestion?: string;
  initialOptions?: string[];
}

export function PollFormModal({
  open,
  onClose,
  mode,
  channelId,
  streamPollId,
  initialQuestion = '',
  initialOptions = ['', ''],
}: PollFormModalProps) {
  const { getToken } = useAuth();
  const { showToast } = useToast();

  const [question, setQuestion] = useState(initialQuestion);
  const [options, setOptions] = useState<string[]>(() => {
    const seeded = initialOptions.map((option) => option.trim());
    while (seeded.length < MIN_OPTIONS) seeded.push('');
    return seeded.slice(0, MAX_OPTIONS);
  });
  const [multipleAnswers, setMultipleAnswers] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [deadline, setDeadline] = useState(() =>
    toLocalDateTimeValue(new Date(Date.now() + 24 * 60 * 60 * 1000)),
  );
  const [hasDeadline, setHasDeadline] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCreate = mode === 'create';

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  }

  function addOption() {
    setOptions((prev) =>
      prev.length < MAX_OPTIONS ? [...prev, ''] : prev,
    );
  }

  function removeOption(index: number) {
    setOptions((prev) =>
      prev.length > MIN_OPTIONS ? prev.filter((_, i) => i !== index) : prev,
    );
  }

  async function handleSubmit() {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return setValidationError('Question is required.');
    const trimmedOptions = Array.from(
      new Set(options.map((option) => option.trim()).filter(Boolean)),
    );
    if (trimmedOptions.length < MIN_OPTIONS) {
      return setValidationError(`Add at least ${MIN_OPTIONS} options.`);
    }

    let deadlineIso: string | undefined;
    if (isCreate && hasDeadline && deadline) {
      const target = new Date(deadline).getTime();
      if (Number.isNaN(target)) return setValidationError('Enter a valid deadline.');
      if (target <= Date.now()) return setValidationError('Deadline must be in the future.');
      deadlineIso = new Date(deadline).toISOString();
    }

    setValidationError(null);
    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');

      if (isCreate) {
        if (!channelId) throw new Error('Missing channel id.');
        await createPoll(token, {
          channelId,
          question: trimmedQuestion,
          options: trimmedOptions,
          multipleAnswers,
          anonymous,
          ...(deadlineIso ? { deadline: deadlineIso } : {}),
        });
        showToast('Poll created.');
      } else {
        if (!streamPollId) throw new Error('Missing poll id.');
        await updatePoll(token, streamPollId, {
          question: trimmedQuestion,
          options: trimmedOptions,
        });
        showToast('Poll updated.');
      }
      onClose();
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : 'Failed to save poll.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isCreate ? 'Create Poll' : 'Edit Poll'}
      maxWidth="md"
    >
      <div className="flex flex-col gap-4">
        <div>
          <Label>Question</Label>
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={280}
            placeholder="Ask the team…"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Options</Label>
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                maxLength={160}
                placeholder={`Option ${index + 1}`}
              />
              <button
                type="button"
                onClick={() => removeOption(index)}
                disabled={options.length <= MIN_OPTIONS}
                aria-label={`Remove option ${index + 1}`}
                className="btn-icon btn-ghost shrink-0 rounded-lg text-slate-400 transition-colors hover:text-red-600 disabled:opacity-40"
              >
                <IconClose width={15} height={15} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addOption}
            disabled={options.length >= MAX_OPTIONS}
            className="inline-flex items-center gap-1 self-start rounded-lg px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-40"
          >
            <IconPlus width={14} height={14} />
            Add option
          </button>
        </div>

        {isCreate && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={multipleAnswers}
                  onChange={(e) => setMultipleAnswers(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600"
                />
                Multiple answers
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600"
                />
                Anonymous
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={hasDeadline}
                  onChange={(e) => setHasDeadline(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600"
                />
                Auto-close at deadline
              </label>
            </div>

            {hasDeadline && (
              <div className="sm:w-64">
                <Label>Deadline</Label>
                <Input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            )}
          </>
        )}

        {validationError && <p className="field-error">{validationError}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? 'Saving…'
              : isCreate
                ? 'Create poll'
                : 'Save changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
