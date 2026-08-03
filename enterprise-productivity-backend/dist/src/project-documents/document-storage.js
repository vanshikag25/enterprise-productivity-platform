"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentStorage = exports.ALLOWED_DOCUMENT_MIME_TYPES = exports.MAX_FILE_SIZE_BYTES = void 0;
exports.sanitizeOriginalName = sanitizeOriginalName;
exports.documentFileFilter = documentFileFilter;
const multer_1 = require("multer");
const path_1 = require("path");
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
exports.MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
exports.ALLOWED_DOCUMENT_MIME_TYPES = [
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
function sanitizeOriginalName(originalName) {
    const base = originalName.split(/[\\/]/).pop() ?? originalName;
    const cleaned = base.replace(/[^\w.\-\s]/g, '_').trim();
    return cleaned.length > 0 ? cleaned.slice(0, 200) : 'document';
}
exports.documentStorage = (0, multer_1.diskStorage)({
    destination: (_req, _file, cb) => cb(null, 'uploads'),
    filename: (_req, file, cb) => {
        const extension = (0, path_1.extname)(file.originalname).toLowerCase().slice(0, 16);
        cb(null, `${(0, crypto_1.randomUUID)()}${extension}`);
    },
});
function documentFileFilter(_req, file, cb) {
    if (exports.ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
        return;
    }
    cb(new common_1.BadRequestException(`File type "${file.mimetype}" is not supported. Allowed: PDF, Word, Excel, PowerPoint, images, ZIP and text.`), false);
}
//# sourceMappingURL=document-storage.js.map