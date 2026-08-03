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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const notifications_schema_1 = require("../database/schema/notifications.schema");
let NotificationsService = class NotificationsService {
    constructor(db) {
        this.db = db;
    }
    async create(input) {
        const [n] = await this.db.insert(notifications_schema_1.notifications).values(input).returning();
        return n;
    }
    async createMany(inputs) {
        if (inputs.length === 0)
            return;
        await this.db.insert(notifications_schema_1.notifications).values(inputs);
    }
    async findMine(userId) {
        return this.db
            .select()
            .from(notifications_schema_1.notifications)
            .where((0, drizzle_orm_1.eq)(notifications_schema_1.notifications.userId, userId))
            .orderBy((0, drizzle_orm_1.desc)(notifications_schema_1.notifications.createdAt))
            .limit(50);
    }
    async unreadCount(userId) {
        const rows = await this.db
            .select()
            .from(notifications_schema_1.notifications)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(notifications_schema_1.notifications.userId, userId), (0, drizzle_orm_1.eq)(notifications_schema_1.notifications.isRead, false)));
        return rows.length;
    }
    async markRead(id, userId) {
        await this.db
            .update(notifications_schema_1.notifications)
            .set({ isRead: true })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(notifications_schema_1.notifications.id, id), (0, drizzle_orm_1.eq)(notifications_schema_1.notifications.userId, userId)));
    }
    async markAllRead(userId) {
        await this.db
            .update(notifications_schema_1.notifications)
            .set({ isRead: true })
            .where((0, drizzle_orm_1.eq)(notifications_schema_1.notifications.userId, userId));
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map