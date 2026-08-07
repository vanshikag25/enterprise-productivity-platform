"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingsModule = void 0;
const common_1 = require("@nestjs/common");
const meetings_service_1 = require("./meetings.service");
const database_module_1 = require("../database/database.module");
const stream_module_1 = require("../stream/stream.module");
const notifications_module_1 = require("../notifications/notifications.module");
const message_source_module_1 = require("../message-source/message-source.module");
let MeetingsModule = class MeetingsModule {
};
exports.MeetingsModule = MeetingsModule;
exports.MeetingsModule = MeetingsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            database_module_1.DatabaseModule,
            stream_module_1.StreamModule,
            notifications_module_1.NotificationsModule,
            message_source_module_1.MessageSourceModule,
        ],
        providers: [meetings_service_1.MeetingsService],
        exports: [meetings_service_1.MeetingsService],
    })
], MeetingsModule);
//# sourceMappingURL=meetings.module.js.map