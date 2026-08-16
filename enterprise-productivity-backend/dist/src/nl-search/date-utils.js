"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRelativeDateRange = resolveRelativeDateRange;
exports.toValidIso = toValidIso;
const DAY_MS = 24 * 60 * 60 * 1000;
function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function addDays(date, days) {
    return new Date(date.getTime() + days * DAY_MS);
}
function startOfWeek(date) {
    const day = startOfDay(date);
    const dow = day.getDay();
    return addDays(day, -(dow === 0 ? 6 : dow - 1));
}
function endOfDayInclusive(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, -1).toISOString();
}
function resolveRelativeDateRange(query, nowIso) {
    const lower = ` ${query.toLowerCase()} `;
    const now = new Date(nowIso);
    const today = startOfDay(now);
    if (/\byesterday\b/.test(lower)) {
        const y = addDays(today, -1);
        return { startDate: y.toISOString(), endDate: endOfDayInclusive(y) };
    }
    if (/\btoday\b/.test(lower)) {
        return { startDate: today.toISOString(), endDate: endOfDayInclusive(today) };
    }
    if (/\blast week\b/.test(lower)) {
        const weekStart = addDays(startOfWeek(now), -7);
        return {
            startDate: weekStart.toISOString(),
            endDate: endOfDayInclusive(addDays(weekStart, 6)),
        };
    }
    if (/\bthis week\b/.test(lower)) {
        const weekStart = startOfWeek(now);
        return { startDate: weekStart.toISOString(), endDate: now.toISOString() };
    }
    if (/\blast month\b/.test(lower)) {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
            startDate: start.toISOString(),
            endDate: endOfDayInclusive(addDays(end, -1)),
        };
    }
    if (/\bthis month\b/.test(lower)) {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    if (/\blast year\b/.test(lower)) {
        return {
            startDate: new Date(now.getFullYear() - 1, 0, 1).toISOString(),
            endDate: endOfDayInclusive(new Date(now.getFullYear(), 0, 1, 0, 0, -1)),
        };
    }
    if (/\bthis year\b/.test(lower)) {
        return {
            startDate: new Date(now.getFullYear(), 0, 1).toISOString(),
            endDate: now.toISOString(),
        };
    }
    const windowMatch = lower.match(/\b(?:last|past|previous)\s+(\d+)\s+(days?|weeks?|months?)\b/);
    if (windowMatch) {
        const count = Math.max(1, parseInt(windowMatch[1], 10));
        const unit = windowMatch[2];
        const multiplier = unit.startsWith('month') ? 30 : unit.startsWith('week') ? 7 : 1;
        const start = addDays(today, -(count * multiplier));
        return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    return null;
}
function toValidIso(value) {
    if (typeof value !== 'string' || !value)
        return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return null;
    return date.toISOString();
}
//# sourceMappingURL=date-utils.js.map