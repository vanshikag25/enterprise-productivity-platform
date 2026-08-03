import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
];

export function sanitizeOriginalName(originalName: string): string {
  const base = originalName.split(/[\\/]/).pop() ?? originalName;
  const cleaned = base.replace(/[^\w.\-\s]/g, '_').trim();
  return cleaned.length > 0 ? cleaned.slice(0, 200) : 'document';
}

export const documentStorage = diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads'),
  filename: (_req, file, cb) => {
    const extension = extname(file.originalname).toLowerCase().slice(0, 16);
    cb(null, `${randomUUID()}${extension}`);
  },
});

export function documentFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) {
  if (ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(
    new BadRequestException(
      `File type "${file.mimetype}" is not supported. Allowed: PDF, Word, Excel, PowerPoint, images, ZIP and text.`,
    ),
    false,
  );
}
