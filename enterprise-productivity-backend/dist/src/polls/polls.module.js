"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PollsModule = void 0;
const common_1 = require("@nestjs/common");
const polls_service_1 = require("./polls.service");
const polls_controller_1 = require("./polls.controller");
const database_module_1 = require("../database/database.module");
const stream_module_1 = require("../stream/stream.module");
const notifications_module_1 = require("../notifications/notifications.module");
const users_module_1 = require("../users/users.module");
const auth_module_1 = require("../auth/auth.module");
let PollsModule = class PollsModule {
};
exports.PollsModule = PollsModule;
exports.PollsModule = PollsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            database_module_1.DatabaseModule,
            stream_module_1.StreamModule,
            notifications_module_1.NotificationsModule,
            users_module_1.UsersModule,
        ],
        controllers: [polls_controller_1.PollsController],
        providers: [polls_service_1.PollsService],
        exports: [polls_service_1.PollsService],
    })
], PollsModule);
//# sourceMappingURL=polls.module.js.map