"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestContextMiddleware = exports.requestContext = void 0;
exports.getRequestContext = getRequestContext;
const common_1 = require("@nestjs/common");
const async_hooks_1 = require("async_hooks");
exports.requestContext = new async_hooks_1.AsyncLocalStorage();
function getRequestContext() {
    return exports.requestContext.getStore();
}
let RequestContextMiddleware = class RequestContextMiddleware {
    use(req, _res, next) {
        const forwarded = req.headers['x-forwarded-for'];
        const forwardedIp = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
            ?.split(',')[0]
            ?.trim();
        const ip = forwardedIp || req.socket?.remoteAddress || undefined;
        const userAgent = typeof req.headers['user-agent'] === 'string'
            ? req.headers['user-agent']
            : undefined;
        exports.requestContext.run({ ip, userAgent }, () => next());
    }
};
exports.RequestContextMiddleware = RequestContextMiddleware;
exports.RequestContextMiddleware = RequestContextMiddleware = __decorate([
    (0, common_1.Injectable)()
], RequestContextMiddleware);
//# sourceMappingURL=request-context.js.map