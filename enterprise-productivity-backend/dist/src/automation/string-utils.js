"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toDisplayString = toDisplayString;
function toDisplayString(value) {
    if (value == null)
        return '';
    if (typeof value === 'string')
        return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    return JSON.stringify(value);
}
//# sourceMappingURL=string-utils.js.map