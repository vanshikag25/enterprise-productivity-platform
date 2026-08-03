import { OnModuleInit } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Response } from 'express';
import { type ProjectDocument } from '../database/schema/project-documents.schema';
import { ProjectAccessService } from '../projects/project-access.service';
export interface DocumentItem extends ProjectDocument {
    uploaderName: string | null;
    fileUrl: string;
}
export declare class ProjectDocumentsService implements OnModuleInit {
    private readonly db;
    private readonly access;
    private readonly logger;
    private readonly uploadsRoot;
    constructor(db: NodePgDatabase, access: ProjectAccessService);
    onModuleInit(): void;
    upload(projectId: string, userId: string, file: Express.Multer.File | undefined): Promise<DocumentItem>;
    findAll(projectId: string, userId: string, q?: string): Promise<DocumentItem[]>;
    getFile(projectId: string, userId: string, id: string, response: Response, inline: boolean): Promise<void>;
    remove(projectId: string, userId: string, id: string): Promise<void>;
    private requireInProject;
    private decorate;
    private decorateMany;
}
