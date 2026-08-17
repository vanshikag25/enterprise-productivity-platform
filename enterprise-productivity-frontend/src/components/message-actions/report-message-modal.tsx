'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { createModerationReport } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Label, Select, Textarea } from '@/components/ui/form';

export const REPORT_REASONS = [
  'Spam',
  'Harassment',
  'Inappropriate content',
  'Impersonation',
  'Privacy violation',
  'Other',
];

interface ReportMessageModalProps {
  open: boolean;
  onClose: () => void;
  targetType: 'message' | 'user';
  channelId?: string;
  channelName: string;
  targetMessageId?: string;
  targetUserId?: string;
  preview?: string;
  reportedBy: string;
}

export function ReportMessageModal({
  open,
  onClose,
  targetType,
  channelId,
  channelName,
  targetMessageId,
  targetUserId,
  preview,
  reportedBy,
}: ReportMessageModalProps) {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const needsCustomReason = reason === 'Other';

  async function handleSubmit() {
    const finalReason = needsCustomReason ? customReason.trim() : reason;
    if (!finalReason) {
      setValidationError(needsCustomReason ? 'Please provide a reason.' : 'Please choose a reason.');
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      await createModerationReport(token, {
        targetType,
        targetMessageId: targetType === 'message' ? targetMessageId : undefined,
        targetUserId: targetType === 'user' ? targetUserId : undefined,
        channelId: channelId ?? '',
        channelName,
        reason: finalReason,
        description: description.trim() || undefined,
      });
      showToast('Content reported. Moderators have been notified.');
      onClose();
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to submit report.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Report content" maxWidth="sm">
      <div className="flex flex-col gap-4">
        <p className="text-xs text-slate-500">
          Reporting {targetType === 'user' ? 'this member' : 'this message'} in{' '}
          <span className="font-medium text-slate-700">{channelName}</span> · {reportedBy}
        </p>
        {preview && targetType === 'message' && (
          <div className="line-clamp-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {preview}
          </div>
        )}
        <div>
          <Label>Reason</Label>
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Select a reason…</option>
            {REPORT_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
        </div>
        {needsCustomReason && (
          <div>
            <Label>Custom reason</Label>
            <Textarea value={customReason} onChange={(e) => setCustomReason(e.target.value)} rows={2} placeholder="Briefly describe the issue…" />
          </div>
        )}
        <div>
          <Label>Additional details (optional)</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Add context for the moderators…" />
        </div>
        {validationError && <p className="field-error">{validationError}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Report'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}