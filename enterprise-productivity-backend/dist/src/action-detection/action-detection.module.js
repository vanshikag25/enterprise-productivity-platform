"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionDetectionModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const database_module_1 = require("../database/database.module");
const stream_module_1 = require("../stream/stream.module");
const users_module_1 = require("../users/users.module");
const action_detection_service_1 = require("./action-detection.service");
const action_detection_controller_1 = require("./action-detection.controller");
const action_detection_provider_1 = require("./action-detection.provider");
const mock_action_detection_provider_1 = require("./providers/mock-action-detection.provider");
const openai_action_detection_provider_1 = require("./providers/openai-action-detection.provider");
function buildProvider(configService) {
    const provider = configService.get('ai.provider') ?? 'mock';
    if (provider === 'openai') {
        const apiKey = configService.get('ai.openaiApiKey');
        if (apiKey) {
            return new openai_action_detection_provider_1.OpenAiActionDetectionProvider(apiKey, configService.get('ai.openaiBaseUrl') ??
                'https://api.openai.com/v1', configService.get('ai.openaiModel') ?? 'gpt-4o-mini');
        }
        new common_1.Logger('ActionDetectionModule').warn('AI_PROVIDER=openai is set but OPENAI_API_KEY is missing; falling back to the mock provider.');
    }
    return new mock_action_detection_provider_1.MockActionDetectionProvider();
}
let ActionDetectionModule = class ActionDetectionModule {
};
exports.ActionDetectionModule = ActionDetectionModule;
exports.ActionDetectionModule = ActionDetectionModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, stream_module_1.StreamModule, users_module_1.UsersModule],
        controllers: [action_detection_controller_1.ActionDetectionController],
        providers: [
            action_detection_service_1.ActionDetectionService,
            {
                provide: action_detection_provider_1.ACTION_DETECTION_PROVIDER,
                useFactory: buildProvider,
                inject: [config_1.ConfigService],
            },
        ],
        exports: [action_detection_service_1.ActionDetectionService],
    })
], ActionDetectionModule);
//# sourceMappingURL=action-detection.module.js.map