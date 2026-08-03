export declare const MAX_FILE_SIZE_BYTES: number;
export declare const ALLOWED_DOCUMENT_MIME_TYPES: string[];
export declare function sanitizeOriginalName(originalName: string): string;
export declare const documentStorage: import("multer").StorageEngine;
export declare function documentFileFilter(_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void): void;
