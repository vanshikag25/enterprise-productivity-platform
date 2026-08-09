'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  listDocuments,
  uploadDocument,
  deleteDocument,
  fetchDocumentBlob,
  formatFileSize,
  fileIconFor,
  isPreviewable,
  type DocumentItem,
  type ProjectItem,
} from '@/lib/projects-api';
import { DocumentPreviewModal } from './document-preview-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { UserListSkeleton } from '@/components/directory/user-list-skeleton';
import { formatLastSeen } from '@/lib/format-date';
import { useToast } from '@/hooks/use-toast';

const ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.svg,.zip,.txt';

interface DocumentsTabProps {
  project: ProjectItem;
  canManage: boolean;
}

export function DocumentsTab({ project, canManage }: DocumentsTabProps) {
  const { getToken, userId } = useAuth();
  const { showToast } = useToast();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<{
    doc: DocumentItem;
    blobUrl: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      setDocuments(await listDocuments(token, project.id, search.trim() || undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents.');
    } finally {
      setIsLoading(false);
    }
  }, [getToken, project.id, search]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  async function handleFileSelected(file: File | null) {
    if (!file) return;
    setIsUploading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const uploaded = await uploadDocument(token, project.id, file);
      setDocuments((prev) => [uploaded, ...prev]);
      showToast(`${file.name} uploaded.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed.', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDownload(doc: DocumentItem) {
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const blob = await fetchDocumentBlob(token, project.id, doc.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = doc.originalName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Download failed.', 'error');
    }
  }

  async function openPreview(doc: DocumentItem) {
    if (!isPreviewable(doc.mimeType)) {
      await handleDownload(doc);
      return;
    }
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const blob = await fetchDocumentBlob(token, project.id, doc.id);
      const blobUrl = URL.createObjectURL(blob);
      setPreview({ doc, blobUrl });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Preview failed.', 'error');
    }
  }

  function closePreview() {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.blobUrl);
      return null;
    });
  }

  async function handleDelete(doc: DocumentItem) {
    if (!window.confirm(`Delete "${doc.originalName}"?`)) return;
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      await deleteDocument(token, project.id, doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      showToast('Document deleted.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete.', 'error');
    }
  }

  const canDeleteDoc = (doc: DocumentItem) => canManage || doc.uploaderId === userId;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded border px-3 py-1.5 text-sm"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="shrink-0 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {isUploading ? 'Uploading…' : '⬆ Upload'}
          </button>
        </div>

        <p className="text-xs text-gray-400">
          Allowed: PDF, Word, Excel, PowerPoint, images, ZIP and text (max 25MB).
        </p>

        {isLoading && <UserListSkeleton />}
        {!isLoading && error && <ErrorState message={error} />}
        {!isLoading && !error && documents.length === 0 && (
          <EmptyState
            title="No documents yet"
            description="Upload files to share them with the project team."
          />
        )}

        {!isLoading && !error && documents.length > 0 && (
          <div className="divide-y rounded border">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 px-3 py-2 text-sm"
              >
                <span aria-hidden="true" className="text-lg">
                  {fileIconFor(doc.mimeType)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{doc.originalName}</span>
                    {doc.version > 1 && (
                      <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                        v{doc.version}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-gray-400">
                    {doc.uploaderName ?? 'Unknown'} · {formatFileSize(doc.sizeBytes)} ·{' '}
                    {formatLastSeen(doc.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => openPreview(doc)}
                    className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handleDownload(doc)}
                    className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                  >
                    Download
                  </button>
                  {canDeleteDoc(doc) && (
                    <button
                      onClick={() => handleDelete(doc)}
                      className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {preview && (
        <DocumentPreviewModal
          doc={preview.doc}
          blobUrl={preview.blobUrl}
          onClose={closePreview}
          onDownload={() => handleDownload(preview.doc)}
        />
      )}
    </div>
  );
}
