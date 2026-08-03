"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ProjectDocumentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectDocumentsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const fs_1 = require("fs");
const path_1 = require("path");
const drizzle_provider_1 = require("../database/drizzle.provider");
const project_documents_schema_1 = require("../database/schema/project-documents.schema");
const users_schema_1 = require("../database/schema/users.schema");
const project_access_service_1 = require("../projects/project-access.service");
const document_storage_1 = require("./document-storage");
let ProjectDocumentsService = ProjectDocumentsService_1 = class ProjectDocumentsService {
    constructor(db, access) {
        this.db = db;
        this.access = access;
        this.logger = new common_1.Logger(ProjectDocumentsService_1.name);
        this.uploadsRoot = (0, path_1.join)(process.cwd(), 'uploads');
    }
    onModuleInit() {
        (0, fs_1.mkdirSync)(this.uploadsRoot, { recursive: true });
    }
    async upload(projectId, userId, file) {
        await this.access.assertRole(projectId, userId, 'member');
        if (!file)
            throw new common_1.BadRequestException('No file was uploaded');
        if (!document_storage_1.ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
            throw new common_1.BadRequestException('Unsupported file type');
        }
        if (file.size > document_storage_1.MAX_FILE_SIZE_BYTES) {
            throw new common_1.BadRequestException('File exceeds the 25MB limit');
        }
        const originalName = (0, document_storage_1.sanitizeOriginalName)(file.originalname);
        const [maxRow] = await this.db
            .select({ max: (0, drizzle_orm_1.max)(project_documents_schema_1.projectDocuments.version) })
            .from(project_documents_schema_1.projectDocuments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(project_documents_schema_1.projectDocuments.projectId, projectId), (0, drizzle_orm_1.eq)(project_documents_schema_1.projectDocuments.originalName, originalName)));
        const version = (maxRow?.max ?? 0) + 1;
        const projectDir = (0, path_1.join)(this.uploadsRoot, 'projects', projectId);
        (0, fs_1.mkdirSync)(projectDir, { recursive: true });
        const storagePath = (0, path_1.join)('projects', projectId, file.filename);
        const target = (0, path_1.join)(this.uploadsRoot, storagePath);
        try {
            (0, fs_1.renameSync)(file.path, target);
        }
        catch (err) {
            this.logger.error(`Failed to persist uploaded file: ${err}`);
            throw new common_1.BadRequestException('Failed to store the uploaded file');
        }
        const [doc] = await this.db
            .insert(project_documents_schema_1.projectDocuments)
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
    async findAll(projectId, userId, q) {
        await this.access.assertMember(projectId, userId);
        const conditions = [(0, drizzle_orm_1.eq)(project_documents_schema_1.projectDocuments.projectId, projectId)];
        const term = q?.trim();
        if (term) {
            conditions.push((0, drizzle_orm_1.ilike)(project_documents_schema_1.projectDocuments.originalName, `%${term}%`));
        }
        const rows = await this.db
            .select()
            .from(project_documents_schema_1.projectDocuments)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(project_documents_schema_1.projectDocuments.createdAt));
        return this.decorateMany(rows);
    }
    async getFile(projectId, userId, id, response, inline) {
        await this.access.assertMember(projectId, userId);
        const doc = await this.requireInProject(id, projectId);
        const absolutePath = (0, path_1.join)(this.uploadsRoot, doc.storagePath);
        if (!(0, fs_1.existsSync)(absolutePath)) {
            throw new common_1.NotFoundException('File is missing from storage');
        }
        const disposition = inline ? 'inline' : 'attachment';
        const asciiName = doc.originalName
            .replace(/[^\x20-\x7e]/g, '_')
            .replace(/"/g, "'");
        response.setHeader('Content-Type', doc.mimeType);
        response.setHeader('Content-Disposition', `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`);
        response.setHeader('X-Content-Type-Options', 'nosniff');
        await new Promise((resolve) => {
            response.sendFile(absolutePath, (err) => {
                if (err) {
                    this.logger.warn(`Failed to send file ${absolutePath}: ${err}`);
                    response.status(404).end();
                }
                resolve();
            });
        });
    }
    async remove(projectId, userId, id) {
        const doc = await this.requireInProject(id, projectId);
        if (doc.uploaderId !== userId) {
            await this.access.assertRole(projectId, userId, 'manager');
        }
        await this.db.delete(project_documents_schema_1.projectDocuments).where((0, drizzle_orm_1.eq)(project_documents_schema_1.projectDocuments.id, id));
        const absolutePath = (0, path_1.join)(this.uploadsRoot, doc.storagePath);
        if ((0, fs_1.existsSync)(absolutePath)) {
            try {
                (0, fs_1.renameSync)(absolutePath, absolutePath + '.deleted');
            }
            catch (err) {
                this.logger.warn(`Failed to remove file ${absolutePath}: ${err}`);
            }
        }
    }
    async requireInProject(id, projectId) {
        const [row] = await this.db
            .select()
            .from(project_documents_schema_1.projectDocuments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(project_documents_schema_1.projectDocuments.id, id), (0, drizzle_orm_1.eq)(project_documents_schema_1.projectDocuments.projectId, projectId)));
        if (!row)
            throw new common_1.NotFoundException(`Document ${id} not found`);
        return row;
    }
    decorate(doc) {
        return {
            ...doc,
            uploaderName: null,
            fileUrl: `/projects/${doc.projectId}/documents/${doc.id}/download`,
        };
    }
    async decorateMany(rows) {
        if (rows.length === 0)
            return [];
        const uploaderIds = Array.from(new Set(rows.map((r) => r.uploaderId)));
        const uploaders = uploaderIds.length
            ? await this.db
                .select()
                .from(users_schema_1.users)
                .where((0, drizzle_orm_1.inArray)(users_schema_1.users.clerkId, uploaderIds))
            : [];
        const nameByUser = new Map(uploaders.map((u) => [
            u.clerkId,
            [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
        ]));
        return rows.map((row) => ({
            ...row,
            uploaderName: nameByUser.get(row.uploaderId) ?? null,
            fileUrl: `/projects/${row.projectId}/documents/${row.id}/download`,
        }));
    }
};
exports.ProjectDocumentsService = ProjectDocumentsService;
exports.ProjectDocumentsService = ProjectDocumentsService = ProjectDocumentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        project_access_service_1.ProjectAccessService])
], ProjectDocumentsService);
//# sourceMappingURL=project-documents.service.js.map