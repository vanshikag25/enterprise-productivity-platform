import type { AuthObject } from '../auth/auth-object';
import type { Response } from 'express';
import { ProjectDocumentsService } from './project-documents.service';
export declare class ProjectDocumentsController {
    private readonly documentsService;
    constructor(documentsService: ProjectDocumentsService);
    upload(auth: AuthObject, projectId: string, file: Express.Multer.File): Promise<import("./project-documents.service").DocumentItem>;
    findAll(auth: AuthObject, projectId: string, q?: string): Promise<import("./project-documents.service").DocumentItem[]>;
    download(auth: AuthObject, projectId: string, id: string, res: Response): Promise<void>;
    preview(auth: AuthObject, projectId: string, id: string, res: Response): Promise<void>;
    remove(auth: AuthObject, projectId: string, id: string): Promise<void>;
}
