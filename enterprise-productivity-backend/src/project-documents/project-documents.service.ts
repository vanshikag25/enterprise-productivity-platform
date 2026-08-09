import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { and, desc, eq, ilike, inArray, max } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { existsSync, mkdirSync, renameSync } from 'fs';
import { join } from 'path';
import type { Response } from 'express';
import { DRIZZLE } from '../database/drizzle.provider';
import {
  projectDocuments,
  type ProjectDocument,
} from '../database/schema/project-documents.schema';
import { users } from '../database/schema/users.schema';
import { ProjectAccessService } from '../projects/project-access.service';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  sanitizeOriginalName,
} from './document-storage';

export interface DocumentItem extends ProjectDocument {
  uploaderName: string | null;
  fileUrl: string;
}

@Injectable()
export class ProjectDocumentsService implements OnModuleInit {
  private readonly logger = new Logger(ProjectDocumentsService.name);
  private readonly uploadsRoot = join(process.cwd(), 'uploads');

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly access: ProjectAccessService,
  ) {}

  onModuleInit() {
    mkdirSync(this.uploadsRoot, { recursive: true });
  }

  async upload(
    projectId: string,
    userId: string,
    file: Express.Multer.File | undefined,
  ): Promise<DocumentItem> {
    await this.access.assertRole(projectId, userId, 'member');
    if (!file) throw new BadRequestException('No file was uploaded');

    if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported file type');
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('File exceeds the 25MB limit');
    }

    const originalName = sanitizeOriginalName(file.originalname);

    const [maxRow] = await this.db
      .select({ max: max(projectDocuments.version) })
      .from(projectDocuments)
      .where(
        and(
          eq(projectDocuments.projectId, projectId),
          eq(projectDocuments.originalName, originalName),
        ),
      );
    const version = (maxRow?.max ?? 0) + 1;

    const projectDir = join(this.uploadsRoot, 'projects', projectId);
    mkdirSync(projectDir, { recursive: true });
    const storagePath = join('projects', projectId, file.filename);
    const target = join(this.uploadsRoot, storagePath);
    try {
      renameSync(file.path, target);
    } catch (err) {
      this.logger.error(`Failed to persist uploaded file: ${err}`);
      throw new BadRequestException('Failed to store the uploaded file');
    }

    const [doc] = await this.db
      .insert(projectDocuments)
      .values({
        projectId,
        uploaderId: userId,
        originalName,
        storagePath,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        version,
      })
      .returning();

    return this.decorate(doc);
  }

  async findAll(
    projectId: string,
    userId: string,
    q?: string,
  ): Promise<DocumentItem[]> {
    await this.access.assertMember(projectId, userId);

    const conditions = [eq(projectDocuments.projectId, projectId)];
    const term = q?.trim();
    if (term) {
      conditions.push(ilike(projectDocuments.originalName, `%${term}%`));
    }

    const rows = await this.db
      .select()
      .from(projectDocuments)
      .where(and(...conditions))
      .orderBy(desc(projectDocuments.createdAt));

    return this.decorateMany(rows);
  }

  async getFile(
    projectId: string,
    userId: string,
    id: string,
    response: Response,
    inline: boolean,
  ): Promise<void> {
    await this.access.assertMember(projectId, userId);
    const doc = await this.requireInProject(id, projectId);
    const absolutePath = join(this.uploadsRoot, doc.storagePath);

    if (!existsSync(absolutePath)) {
      throw new NotFoundException('File is missing from storage');
    }

    const disposition = inline ? 'inline' : 'attachment';
    const asciiName = doc.originalName
      .replace(/[^\x20-\x7e]/g, '_')
      .replace(/"/g, "'");
    response.setHeader('Content-Type', doc.mimeType);
    response.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`,
    );
    response.setHeader('X-Content-Type-Options', 'nosniff');

    await new Promise<void>((resolve) => {
      response.sendFile(absolutePath, (err) => {
        if (err) {
          this.logger.warn(`Failed to send file ${absolutePath}: ${err}`);
          response.status(404).end();
        }
        resolve();
      });
    });
  }

  async remove(projectId: string, userId: string, id: string): Promise<void> {
    const doc = await this.requireInProject(id, projectId);
    if (doc.uploaderId !== userId) {
      await this.access.assertRole(projectId, userId, 'manager');
    }
    await this.db.delete(projectDocuments).where(eq(projectDocuments.id, id));

    const absolutePath = join(this.uploadsRoot, doc.storagePath);
    if (existsSync(absolutePath)) {
      try {
        renameSync(absolutePath, absolutePath + '.deleted');
      } catch (err) {
        this.logger.warn(`Failed to remove file ${absolutePath}: ${err}`);
      }
    }
  }

  private async requireInProject(
    id: string,
    projectId: string,
  ): Promise<ProjectDocument> {
    const [row] = await this.db
      .select()
      .from(projectDocuments)
      .where(
        and(
          eq(projectDocuments.id, id),
          eq(projectDocuments.projectId, projectId),
        ),
      );
    if (!row) throw new NotFoundException(`Document ${id} not found`);
    return row;
  }

  private decorate(doc: ProjectDocument): DocumentItem {
    return {
      ...doc,
      uploaderName: null,
      fileUrl: `/projects/${doc.projectId}/documents/${doc.id}/download`,
    };
  }

  private async decorateMany(rows: ProjectDocument[]): Promise<DocumentItem[]> {
    if (rows.length === 0) return [];

    const uploaderIds = Array.from(new Set(rows.map((r) => r.uploaderId)));
    const uploaders = uploaderIds.length
      ? await this.db
          .select()
          .from(users)
          .where(inArray(users.username, uploaderIds))
      : [];
    const nameByUser = new Map(
      uploaders.map((u) => [
        u.username,
        [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
      ]),
    );

    return rows.map((row) => ({
      ...row,
      uploaderName: nameByUser.get(row.uploaderId) ?? null,
      fileUrl: `/projects/${row.projectId}/documents/${row.id}/download`,
    }));
  }
}
