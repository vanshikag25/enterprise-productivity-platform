'use client';

import type { DocumentItem } from '@/lib/projects-api';
import { isPreviewable } from '@/lib/projects-api';

interface DocumentPreviewModalProps {
  doc: DocumentItem;
  blobUrl: string;
  onClose: () => void;
  onDownload: () => void;
}

export function DocumentPreviewModal({
  doc,
  blobUrl,
  onClose,
  onDownload,
}: DocumentPreviewModalProps) {
  const isImage = doc.mimeType.startsWith('image/');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${doc.originalName}`}
      >
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h2 className="truncate text-sm font-semibold">{doc.originalName}</h2>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={onDownload}
              className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
            >
              Download
            </button>
            <button
              onClick={onClose}
              aria-label="Close preview"
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-gray-50">
          {isImage ? (
            <img
              src={blobUrl}
              alt={doc.originalName}
              className="mx-auto max-h-full object-contain"
            />
          ) : isPreviewable(doc.mimeType) ? (
            <iframe
              src={blobUrl}
              title={doc.originalName}
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-gray-500">
              <span>This file type cannot be previewed.</span>
              <button onClick={onDownload} className="text-blue-600 hover:underline">
                Download instead
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
