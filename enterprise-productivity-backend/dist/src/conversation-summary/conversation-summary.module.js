"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationSummaryModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const database_module_1 = require("../database/database.module");
const stream_module_1 = require("../stream/stream.module");
const users_module_1 = require("../users/users.module");
const conversation_summary_service_1 = require("./conversation-summary.service");
const conversation_summary_controller_1 = require("./conversation-summary.controller");
const conversation_summary_provider_1 = require("./conversation-summary.provider");
const mock_conversation_summary_provider_1 = require("./providers/mock-conversation-summary.provider");
const openai_conversation_summary_provider_1 = require("./providers/openai-conversation-summary.provider");
function buildProvider(configService) {
    const provider = configService.get('ai.provider') ?? 'mock';
    if (provider === 'gemini' || provider === 'openai') {
        const apiKey = configService.get('ai.geminiApiKey') ??
            configService.get('ai.openaiApiKey');
        if (apiKey) {
            return new openai_conversation_summary_provider_1.OpenAiConversationSummaryProvider(apiKey, configService.get('ai.geminiBaseUrl') ??
                configService.get('ai.openaiBaseUrl') ??
                'https://generativelanguage.googleapis.com/v1beta', configService.get('ai.geminiModel') ??
                configService.get('ai.openaiModel') ??
                'gemini-2.0-flash');
        }
        new common_1.Logger('ConversationSummaryModule').warn('AI_PROVIDER=gemini/openai is set but the API key is missing; falling back to the mock provider.');
    }
    return new mock_conversation_summary_provider_1.MockConversationSummaryProvider();
}
let ConversationSummaryModule = class ConversationSummaryModule {
};
exports.ConversationSummaryModule = ConversationSummaryModule;
exports.ConversationSummaryModule = ConversationSummaryModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, stream_module_1.StreamModule, users_module_1.UsersModule],
        controllers: [conversation_summary_controller_1.ConversationSummaryController],
        providers: [
            conversation_summary_service_1.ConversationSummaryService,
            {
                provide: conversation_summary_provider_1.CONVERSATION_SUMMARY_PROVIDER,
                useFactory: buildProvider,
                inject: [config_1.ConfigService],
            },
        ],
        exports: [conversation_summary_service_1.ConversationSummaryService],
    })
], ConversationSummaryModule);
//# sourceMappingURL=conversation-summary.module.js.map