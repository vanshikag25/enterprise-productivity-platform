"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NlSearchModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stream_module_1 = require("../stream/stream.module");
const users_module_1 = require("../users/users.module");
const nl_search_service_1 = require("./nl-search.service");
const nl_search_controller_1 = require("./nl-search.controller");
const nl_search_provider_1 = require("./nl-search.provider");
const mock_nl_search_provider_1 = require("./providers/mock-nl-search.provider");
const openai_nl_search_provider_1 = require("./providers/openai-nl-search.provider");
function buildProvider(configService) {
    const provider = configService.get('ai.provider') ?? 'mock';
    if (provider === 'gemini' || provider === 'openai') {
        const apiKey = configService.get('ai.geminiApiKey') ??
            configService.get('ai.openaiApiKey');
        if (apiKey) {
            return new openai_nl_search_provider_1.OpenAiNlSearchProvider(apiKey, configService.get('ai.geminiBaseUrl') ??
                configService.get('ai.openaiBaseUrl') ??
                'https://generativelanguage.googleapis.com/v1beta', configService.get('ai.geminiModel') ??
                configService.get('ai.openaiModel') ??
                'gemini-2.0-flash');
        }
        new common_1.Logger('NlSearchModule').warn('AI_PROVIDER=gemini/openai is set but the API key is missing; falling back to the mock provider.');
    }
    return new mock_nl_search_provider_1.MockNlSearchProvider();
}
let NlSearchModule = class NlSearchModule {
};
exports.NlSearchModule = NlSearchModule;
exports.NlSearchModule = NlSearchModule = __decorate([
    (0, common_1.Module)({
        imports: [stream_module_1.StreamModule, users_module_1.UsersModule],
        controllers: [nl_search_controller_1.NlSearchController],
        providers: [
            nl_search_service_1.NlSearchService,
            {
                provide: nl_search_provider_1.NL_SEARCH_PROVIDER,
                useFactory: buildProvider,
                inject: [config_1.ConfigService],
            },
        ],
        exports: [nl_search_service_1.NlSearchService],
    })
], NlSearchModule);
//# sourceMappingURL=nl-search.module.js.map