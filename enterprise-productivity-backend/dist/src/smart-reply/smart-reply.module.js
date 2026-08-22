"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartReplyModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stream_module_1 = require("../stream/stream.module");
const users_module_1 = require("../users/users.module");
const smart_reply_service_1 = require("./smart-reply.service");
const smart_reply_controller_1 = require("./smart-reply.controller");
const smart_reply_provider_1 = require("./smart-reply.provider");
const mock_smart_reply_provider_1 = require("./providers/mock-smart-reply.provider");
const openai_smart_reply_provider_1 = require("./providers/openai-smart-reply.provider");
function buildProvider(configService) {
    const provider = configService.get('ai.provider') ?? 'mock';
    if (provider === 'gemini' || provider === 'openai') {
        const apiKey = configService.get('ai.geminiApiKey') ??
            configService.get('ai.openaiApiKey');
        if (apiKey) {
            return new openai_smart_reply_provider_1.OpenAiSmartReplyProvider(apiKey, configService.get('ai.geminiBaseUrl') ??
                configService.get('ai.openaiBaseUrl') ??
                'https://generativelanguage.googleapis.com/v1beta', configService.get('ai.geminiModel') ??
                configService.get('ai.openaiModel') ??
                'gemini-2.0-flash');
        }
        new common_1.Logger('SmartReplyModule').warn('AI_PROVIDER=gemini/openai is set but the API key is missing; falling back to the mock provider.');
    }
    return new mock_smart_reply_provider_1.MockSmartReplyProvider();
}
let SmartReplyModule = class SmartReplyModule {
};
exports.SmartReplyModule = SmartReplyModule;
exports.SmartReplyModule = SmartReplyModule = __decorate([
    (0, common_1.Module)({
        imports: [stream_module_1.StreamModule, users_module_1.UsersModule],
        controllers: [smart_reply_controller_1.SmartReplyController],
        providers: [
            smart_reply_service_1.SmartReplyService,
            {
                provide: smart_reply_provider_1.SMART_REPLY_PROVIDER,
                useFactory: buildProvider,
                inject: [config_1.ConfigService],
            },
        ],
        exports: [smart_reply_service_1.SmartReplyService],
    })
], SmartReplyModule);
//# sourceMappingURL=smart-reply.module.js.map