"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MockActionDetectionProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockActionDetectionProvider = void 0;
const common_1 = require("@nestjs/common");
const WEEKDAYS = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
};
let MockActionDetectionProvider = MockActionDetectionProvider_1 = class MockActionDetectionProvider {
    constructor() {
        this.name = 'mock';
        this.logger = new common_1.Logger(MockActionDetectionProvider_1.name);
    }
    async detect(context) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const text = context.message.text.trim();
        if (!text)
            return { actions: [], provider: this.name };
        const cues = this.detectCues(text);
        return { actions: cues.slice(0, 4), provider: this.name };
    }
    detectCues(text) {
        const lower = ` ${text.toLowerCase()} `;
        const cues = [];
        const task = this.detectTask(lower, text);
        if (task)
            cues.push(task);
        const meeting = this.detectMeeting(lower, text);
        if (meeting)
            cues.push(meeting);
        const deadline = this.detectDeadline(lower, text);
        if (deadline)
            cues.push(deadline);
        const reminder = this.detectReminder(lower, text);
        if (reminder)
            cues.push(reminder);
        const decision = this.detectDecision(lower, text);
        if (decision)
            cues.push(decision);
        const followUp = this.detectFollowUp(lower, text);
        if (followUp)
            cues.push(followUp);
        return cues.map(({ intentType, confidence, title, summary, meta }) => ({
            intentType,
            title,
            summary,
            confidence: Math.round(confidence * 100) / 100,
            meta,
        }));
    }
    detectTask(lower, text) {
        const strong = /(create|add|open|start|raise)\s+a\s+(task|to-?do|ticket)/.test(lower) ||
            /(new\s+(task|ticket)|to-?do list|task\s*[:]|todo\s*[:])/.test(lower) ||
            /let['’]s\s+(create|make|add)\s+.*(task|ticket)/.test(lower);
        const weak = /(need|should|must)\s+(to\s+)?(create|add|open|do|handle|complete)\s/.test(lower) || /(assign|tackle|pick up)\s/.test(lower);
        if (!strong && !weak)
            return null;
        const title = this.extractTitle(text) ?? this.snippet(text);
        return {
            intentType: 'task',
            confidence: strong ? 0.92 : 0.74,
            title,
            summary: 'A task should be created from this message.',
            meta: {
                description: this.snippet(text, 280),
                ...(this.parseDate(text)
                    ? { dueDate: this.parseDate(text).toISOString() }
                    : {}),
            },
        };
    }
    detectMeeting(lower, text) {
        const strong = /(schedule|book|set( up)?|arrange|plan)\s+(a\s+)?(meeting|call|sync|1:1|one-?on-?one|stand-?up|standup|huddle)/.test(lower) ||
            /(schedule|book|set( up)?|arrange|plan)\s.*(meeting|call|sync|demo|workshop)/.test(lower) ||
            /meeting\s+(tomorrow|today|next|on\s+\w+)/.test(lower);
        const weak = /(want|need|should|let['’]s)\s+(to\s+)?(have|do|hold|organize)\s+a\s+meeting/.test(lower) || /(sync up|catch up|touch base)/.test(lower);
        if (!strong && !weak)
            return null;
        const title = this.extractTitle(text) ?? 'Team sync';
        const date = this.parseDate(text);
        const time = this.extractTime(text);
        return {
            intentType: 'meeting',
            confidence: strong ? 0.9 : 0.72,
            title,
            summary: 'A meeting request was detected.',
            meta: {
                ...(date ? { scheduledDate: date.toISOString() } : {}),
                ...(time ? { startTime: time } : {}),
                ...(time ? { endTime: this.plusOneHour(time) } : {}),
            },
        };
    }
    detectDeadline(lower, text) {
        const strong = /deadline|due\s+date|due\s+(by|on)|must\s+be\s+done\s+by|needs?\s+to\s+be\s+(done|ready|submitted)\s+by/.test(lower) ||
            /(by|before)\s+(friday|monday|tuesday|wednesday|thursday|saturday|sunday|tomorrow|eod|end\s+of\s+day|next\s+week)/.test(lower);
        if (!strong)
            return null;
        const title = this.extractTitle(text) ?? this.snippet(text);
        const date = this.parseDate(text) ?? this.defaultEndOfWeek();
        return {
            intentType: 'deadline',
            confidence: 0.88,
            title,
            summary: 'A deadline was mentioned in the conversation.',
            meta: { dueDate: date.toISOString() },
        };
    }
    detectReminder(lower, text) {
        const strong = /(remind(er|s| me| us)?|set\s+a\s+reminder)/.test(lower);
        const weak = /(don['’]t forget|remember to|ping me|nudge me|follow up reminder)/.test(lower);
        if (!strong && !weak)
            return null;
        const title = this.extractTitle(text) ?? this.snippet(text);
        const date = this.parseDate(text) ?? this.inOneHour();
        return {
            intentType: 'reminder',
            confidence: strong ? 0.9 : 0.75,
            title,
            summary: 'A reminder should be scheduled from this message.',
            meta: {
                scheduledFor: date.toISOString(),
                notes: this.snippet(text, 280),
            },
        };
    }
    detectDecision(lower, text) {
        const strong = /(we|they|everyone|the team)\s+(decided|settled|agreed|landed)\s+on|(we|i)\s+decided\s+to\s+use|decision\s+has\s+been\s+made|let['’]s\s+go\s+with|going\s+with\s+postgres/.test(lower);
        const weak = /(let['’]s\s+go\s+with|we['’]?ll\s+use|we\s+will\s+use|agreed\s+on|leaning\s+towards)/.test(lower);
        if (!strong && !weak)
            return null;
        const title = titleOfDecision(lower) ?? this.snippet(text);
        return {
            intentType: 'decision',
            confidence: strong ? 0.91 : 0.76,
            title,
            summary: 'A decision appears to have been reached.',
            meta: { decision: title },
        };
    }
    detectFollowUp(lower, text) {
        const strong = /(follow\s+up|follow-?up|followup|check\s+in|circle\s+back|reach\s+out\s+to|get\s+back\s+to\s+(them|him|her|you|the))/i.test(lower);
        if (!strong)
            return null;
        const title = this.extractTitle(text) ?? this.snippet(text);
        const date = this.parseDate(text) ?? this.inOneWeek();
        return {
            intentType: 'follow_up',
            confidence: 0.85,
            title,
            summary: 'A follow-up was mentioned and should be tracked.',
            meta: {
                scheduledFor: date.toISOString(),
                notes: this.snippet(text, 280),
            },
        };
    }
    extractTitle(text) {
        const quoted = text.match(/["“]([^"”]{4,80})["”]/);
        if (quoted)
            return quoted[1].trim();
        const trimmed = text.trim();
        const colon = trimmed.match(/^(?:task|todo|to-?do|meeting|reminder|follow-?up)\s*:\s*(.+)$/i);
        if (colon)
            return colon[1].trim();
        const after = trimmed.match(/(?:about|regarding|for|to|with)\s+(.+?)(?:[.!?]|$)/i);
        const candidate = after?.[1]?.trim();
        if (candidate && candidate.split(/\s+/).length <= 8)
            return candidate;
        return null;
    }
    snippet(text, max = 80) {
        const normalized = text.replace(/\s+/g, ' ').trim();
        return normalized.length > max
            ? `${normalized.slice(0, max).trimEnd()}…`
            : normalized;
    }
    extractTime(text) {
        const match = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
        if (!match)
            return null;
        return `${match[1].padStart(2, '0')}:${match[2]}`;
    }
    plusOneHour(time) {
        const [h, m] = time.split(':').map(Number);
        const next = new Date();
        next.setHours(h + 1, m, 0, 0);
        return `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`;
    }
    parseDate(text) {
        const lower = text.toLowerCase();
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
        if (iso) {
            const y = Number(iso[1]);
            const m = Number(iso[2]);
            const d = Number(iso[3]);
            return new Date(Date.UTC(y, m - 1, d));
        }
        const relative = lower.match(/\btoday\b|\btonight\b/);
        if (relative)
            return startOfDay;
        if (/\btomorrow\b/.test(lower)) {
            return new Date(startOfDay.getTime() + 86_400_000);
        }
        const inDays = lower.match(/\bin\s+(\d+)\s+days?\b/);
        if (inDays) {
            return new Date(startOfDay.getTime() + Number(inDays[1]) * 86_400_000);
        }
        if (/\bnext\s+week\b/.test(lower)) {
            return new Date(startOfDay.getTime() + 7 * 86_400_000);
        }
        for (const [name, dayIndex] of Object.entries(WEEKDAYS)) {
            const dayMatch = lower.match(new RegExp(`(next\\s+)?${name}\\b`));
            if (!dayMatch)
                continue;
            const daysAhead = (dayIndex - startOfDay.getDay() + 7) % 7;
            const base = dayMatch[1] ? daysAhead + 7 : daysAhead;
            return new Date(startOfDay.getTime() + base * 86_400_000);
        }
        return null;
    }
    inOneHour() {
        return new Date(Date.now() + 60 * 60 * 1000);
    }
    inOneWeek() {
        return new Date(Date.now() + 7 * 86_400_000);
    }
    defaultEndOfWeek() {
        const now = new Date();
        const end = new Date(now);
        const daysUntilFriday = (5 - now.getDay() + 7) % 7;
        end.setDate(now.getDate() + (daysUntilFriday || 7));
        end.setHours(17, 0, 0, 0);
        return end;
    }
};
exports.MockActionDetectionProvider = MockActionDetectionProvider;
exports.MockActionDetectionProvider = MockActionDetectionProvider = MockActionDetectionProvider_1 = __decorate([
    (0, common_1.Injectable)()
], MockActionDetectionProvider);
function titleOfDecision(lower) {
    const match = lower.match(/(?:decided|decided\s+to\s+use|going\s+with|let['’]?s\s+go\s+with|we['’]?ll\s+use|we\s+will\s+use|agreed\s+on|settled\s+on)\s+(.+)$/);
    if (!match)
        return null;
    const title = match[1].replace(/[.!?]+$/, '').trim();
    return title || null;
}
//# sourceMappingURL=mock-action-detection.provider.js.map