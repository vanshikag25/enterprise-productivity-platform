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
exports.ConditionEvaluatorService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const users_service_1 = require("../users/users.service");
const project_access_service_1 = require("../projects/project-access.service");
const string_utils_1 = require("./string-utils");
let ConditionEvaluatorService = class ConditionEvaluatorService {
    constructor(db, usersService, access) {
        this.db = db;
        this.usersService = usersService;
        this.access = access;
    }
    async evaluate(conditions, payload) {
        if (!conditions || conditions.length === 0)
            return true;
        const ctx = await this.buildContext(payload);
        return conditions.every((condition) => this.evaluateOne(condition, ctx));
    }
    async buildContext(payload) {
        const ctx = { ...payload };
        if (payload.priority != null)
            ctx.taskPriority = payload.priority;
        if (payload.status != null)
            ctx.taskStatus = payload.status;
        const actor = payload.actor ? (0, string_utils_1.toDisplayString)(payload.actor) : null;
        if (actor) {
            const user = await this.usersService.findByUsername(actor);
            if (user) {
                ctx.actorRole = user.role;
            }
            if (payload.projectId && typeof payload.projectId === 'string') {
                ctx.projectRole = await this.access.memberRole(payload.projectId, actor);
            }
        }
        if (payload.userId && typeof payload.userId === 'string') {
            const user = await this.usersService.findByUsername(payload.userId);
            if (user)
                ctx.userRole = user.role;
        }
        return ctx;
    }
    evaluateOne(condition, ctx) {
        const raw = ctx[condition.field];
        switch (condition.operator) {
            case 'eq':
                return this.eq(raw, condition.value);
            case 'neq':
                return !this.eq(raw, condition.value);
            case 'in': {
                const values = Array.isArray(condition.value)
                    ? condition.value
                    : [condition.value];
                return values.some((v) => this.eq(raw, v));
            }
            case 'contains':
                if (typeof raw !== 'string')
                    return false;
                return raw
                    .toLowerCase()
                    .includes(String(condition.value).toLowerCase());
            case 'withinDays': {
                if (raw == null)
                    return false;
                const due = new Date(raw).getTime();
                if (Number.isNaN(due))
                    return false;
                const days = Number(condition.value);
                if (Number.isNaN(days))
                    return false;
                const now = Date.now();
                const horizon = now + days * 86_400_000;
                return due >= now && due <= horizon;
            }
            case 'gt':
            case 'gte':
            case 'lt':
            case 'lte':
                return this.compare(raw, condition.value, condition.operator);
            default:
                return false;
        }
    }
    eq(raw, value) {
        if (raw == null)
            return false;
        if (value == null)
            return false;
        if (typeof raw === 'number' ||
            typeof raw === 'boolean' ||
            typeof value === 'number') {
            return Number(raw) === Number(value);
        }
        return ((0, string_utils_1.toDisplayString)(raw).toLowerCase() ===
            (0, string_utils_1.toDisplayString)(value).toLowerCase());
    }
    compare(raw, value, op) {
        if (raw == null || value == null)
            return false;
        const rawNum = Number(raw);
        const valueNum = Number(value);
        if (!Number.isNaN(rawNum) && !Number.isNaN(valueNum)) {
            switch (op) {
                case 'gt':
                    return rawNum > valueNum;
                case 'gte':
                    return rawNum >= valueNum;
                case 'lt':
                    return rawNum < valueNum;
                case 'lte':
                    return rawNum <= valueNum;
            }
        }
        const rawDate = new Date(raw).getTime();
        const valueDate = new Date(value).getTime();
        if (!Number.isNaN(rawDate) && !Number.isNaN(valueDate)) {
            switch (op) {
                case 'gt':
                    return rawDate > valueDate;
                case 'gte':
                    return rawDate >= valueDate;
                case 'lt':
                    return rawDate < valueDate;
                case 'lte':
                    return rawDate <= valueDate;
            }
        }
        const a = (0, string_utils_1.toDisplayString)(raw);
        const b = (0, string_utils_1.toDisplayString)(value);
        switch (op) {
            case 'gt':
                return a > b;
            case 'gte':
                return a >= b;
            case 'lt':
                return a < b;
            case 'lte':
                return a <= b;
        }
    }
};
exports.ConditionEvaluatorService = ConditionEvaluatorService;
exports.ConditionEvaluatorService = ConditionEvaluatorService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        users_service_1.UsersService,
        project_access_service_1.ProjectAccessService])
], ConditionEvaluatorService);
//# sourceMappingURL=condition-evaluator.service.js.map