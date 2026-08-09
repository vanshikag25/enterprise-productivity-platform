"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentUser = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.auth) {
        throw new common_1.UnauthorizedException('Request is not authenticated');
    }
    return request.auth;
});
//# sourceMappingURL=current-user.decorator.js.map