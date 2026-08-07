"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageSourceModule = void 0;
const common_1 = require("@nestjs/common");
const stream_module_1 = require("../stream/stream.module");
const message_source_service_1 = require("./message-source.service");
let MessageSourceModule = class MessageSourceModule {
};
exports.MessageSourceModule = MessageSourceModule;
exports.MessageSourceModule = MessageSourceModule = __decorate([
    (0, common_1.Module)({
        imports: [stream_module_1.StreamModule],
        providers: [message_source_service_1.MessageSourceService],
        exports: [message_source_service_1.MessageSourceService],
    })
], MessageSourceModule);
//# sourceMappingURL=message-source.module.js.map