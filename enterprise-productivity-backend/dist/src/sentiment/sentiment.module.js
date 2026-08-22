"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentimentModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const database_module_1 = require("../database/database.module");
const stream_module_1 = require("../stream/stream.module");
const users_module_1 = require("../users/users.module");
const projects_module_1 = require("../projects/projects.module");
const sentiment_service_1 = require("./sentiment.service");
const sentiment_controller_1 = require("./sentiment.controller");
const sentiment_provider_1 = require("./sentiment.provider");
const mock_sentiment_provider_1 = require("./providers/mock-sentiment.provider");
const openai_sentiment_provider_1 = require("./providers/openai-sentiment.provider");
function buildProvider(configService) {
    const provider = configService.get('ai.provider') ?? 'mock';
    if (provider === 'gemini' || provider === 'openai') {
        const apiKey = configService.get('ai.geminiApiKey') ??
            configService.get('ai.openaiApiKey');
        if (apiKey) {
            return new openai_sentiment_provider_1.OpenAiSentimentProvider(apiKey, configService.get('ai.geminiBaseUrl') ??
                configService.get('ai.openaiBaseUrl') ??
                'https://generativelanguage.googleapis.com/v1beta', configService.get('ai.geminiModel') ??
                configService.get('ai.openaiModel') ??
                'gemini-2.0-flash');
        }
        new common_1.Logger('SentimentModule').warn('AI_PROVIDER=gemini/openai is set but the API key is missing; falling back to the mock provider.');
    }
    return new mock_sentiment_provider_1.MockSentimentProvider();
}
let SentimentModule = class SentimentModule {
};
exports.SentimentModule = SentimentModule;
exports.SentimentModule = SentimentModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, stream_module_1.StreamModule, users_module_1.UsersModule, projects_module_1.ProjectsModule],
        controllers: [sentiment_controller_1.SentimentController],
        providers: [
            sentiment_service_1.SentimentService,
            {
                provide: sentiment_provider_1.SENTIMENT_PROVIDER,
                useFactory: buildProvider,
                inject: [config_1.ConfigService],
            },
        ],
        exports: [sentiment_service_1.SentimentService],
    })
], SentimentModule);
//# sourceMappingURL=sentiment.module.js.map