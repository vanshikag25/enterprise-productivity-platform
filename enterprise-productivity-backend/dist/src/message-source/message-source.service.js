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
var MessageSourceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageSourceService = void 0;
const common_1 = require("@nestjs/common");
const stream_service_1 = require("../stream/stream.service");
let MessageSourceService = MessageSourceService_1 = class MessageSourceService {
    constructor(streamService) {
        this.streamService = streamService;
        this.logger = new common_1.Logger(MessageSourceService_1.name);
    }
    async confirmSourceMessage(input) {
        const { channelId, messageId, userId, confirmationText } = input;
        if (!channelId || !messageId)
            return false;
        try {
            const client = this.streamService.getClient();
            const { message } = await client.getMessage(messageId);
            if (message.channel?.id && message.channel.id !== channelId) {
                this.logger.warn(`Message ${messageId} does not belong to channel ${channelId}; skipping confirmation.`);
                return false;
            }
            const channel = client.channel('messaging', channelId);
            await channel.sendMessage({
                text: confirmationText,
                user_id: userId,
            });
            return true;
        }
        catch (err) {
            this.logger.warn(`Failed to confirm source message ${messageId}: ${err instanceof Error ? err.message : err}`);
            return false;
        }
    }
};
exports.MessageSourceService = MessageSourceService;
exports.MessageSourceService = MessageSourceService = MessageSourceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [stream_service_1.StreamService])
], MessageSourceService);
//# sourceMappingURL=message-source.service.js.map