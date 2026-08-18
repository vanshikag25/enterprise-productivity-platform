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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const audit_logs_schema_1 = require("../database/schema/audit-logs.schema");
const roles_1 = require("../rbac/roles");
const request_context_1 = require("./request-context");
function serialize(event) {
    return {
        id: event.id,
        actionType: event.actionType,
        actorId: event.actorId,
        actorRole: event.actorRole,
        actorName: event.actorName,
        targetUserId: event.targetUserId,
        targetUserName: event.targetUserName,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        resourceName: event.resourceName,
        channelId: event.channelId,
        projectId: event.projectId,
        previousValue: event.previousValue,
        newValue: event.newValue,
        reason: event.reason,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        createdAt: event.createdAt.toISOString(),
    };
}
let AuditService = class AuditService {
    constructor(db) {
        this.db = db;
    }
    async record(input, options) {
        const db = options?.tx ?? this.db;
        const meta = (0, request_context_1.getRequestContext)();
        const [row] = await db
            .insert(audit_logs_schema_1.auditEvents)
            .values({
            actionType: input.actionType,
            actorId: input.actorId,
            actorRole: input.actorRole,
            actorName: input.actorName ?? null,
            targetUserId: input.targetUserId ?? null,
            targetUserName: input.targetUserName ?? null,
            resourceType: input.resourceType,
            resourceId: input.resourceId ?? null,
            resourceName: input.resourceName ?? null,
            channelId: input.channelId ?? null,
            projectId: input.projectId ?? null,
            previousValue: input.previousValue ?? null,
            newValue: input.newValue ?? null,
            reason: input.reason ?? null,
            ipAddress: meta?.ip ?? null,
            userAgent: meta?.userAgent ?? null,
        })
            .returning();
        return row;
    }
    actionTypes() {
        return audit_logs_schema_1.auditActionTypeEnum.enumValues;
    }
    async listLogs(actor, params) {
        if (!(0, roles_1.hasMinRole)(actor.role, 'admin')) {
            throw new common_1.ForbiddenException('Only Super Admins and Admins can view audit logs.');
        }
        const conditions = [];
        if (params.actionType) {
            conditions.push((0, drizzle_orm_1.eq)(audit_logs_schema_1.auditEvents.actionType, params.actionType));
        }
        if (params.actorId) {
            conditions.push((0, drizzle_orm_1.eq)(audit_logs_schema_1.auditEvents.actorId, params.actorId));
        }
        if (params.channelId) {
            conditions.push((0, drizzle_orm_1.eq)(audit_logs_schema_1.auditEvents.channelId, params.channelId));
        }
        if (params.search) {
            const term = `%${params.search.trim()}%`;
            conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(audit_logs_schema_1.auditEvents.actorName, term), (0, drizzle_orm_1.ilike)(audit_logs_schema_1.auditEvents.actorId, term), (0, drizzle_orm_1.ilike)(audit_logs_schema_1.auditEvents.targetUserName, term), (0, drizzle_orm_1.ilike)(audit_logs_schema_1.auditEvents.targetUserId, term), (0, drizzle_orm_1.ilike)(audit_logs_schema_1.auditEvents.resourceName, term), (0, drizzle_orm_1.ilike)(audit_logs_schema_1.auditEvents.resourceId, term), (0, drizzle_orm_1.ilike)(audit_logs_schema_1.auditEvents.channelId, term)));
        }
        if (params.startDate) {
            conditions.push((0, drizzle_orm_1.gte)(audit_logs_schema_1.auditEvents.createdAt, new Date(params.startDate)));
        }
        if (params.endDate) {
            conditions.push((0, drizzle_orm_1.lte)(audit_logs_schema_1.auditEvents.createdAt, new Date(params.endDate)));
        }
        const where = conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined;
        const orderBy = params.sort === 'oldest'
            ? (0, drizzle_orm_1.asc)(audit_logs_schema_1.auditEvents.createdAt)
            : (0, drizzle_orm_1.desc)(audit_logs_schema_1.auditEvents.createdAt);
        const [rows, countRows] = await Promise.all([
            this.db
                .select()
                .from(audit_logs_schema_1.auditEvents)
                .where(where)
                .orderBy(orderBy)
                .limit(params.limit)
                .offset((params.page - 1) * params.limit),
            this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
                .from(audit_logs_schema_1.auditEvents)
                .where(where),
        ]);
        const total = countRows[0]?.count ?? 0;
        return {
            items: rows.map(serialize),
            total,
            page: params.page,
            limit: params.limit,
            totalPages: Math.max(1, Math.ceil(total / params.limit)),
        };
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], AuditService);
//# sourceMappingURL=audit.service.js.map