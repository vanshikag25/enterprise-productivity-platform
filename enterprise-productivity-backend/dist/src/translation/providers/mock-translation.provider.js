"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockTranslationProvider = void 0;
const common_1 = require("@nestjs/common");
const PHRASES = {
    hi: {
        hello: 'namaste',
        thank: 'dhanyavad',
        thanks: 'dhanyavad',
        please: 'kripya',
        yes: 'haan',
        no: 'nahin',
        ok: 'theek hai',
        okay: 'theek hai',
        good: 'achha',
        'good morning': 'suprabhat',
        project: 'pariyojana',
        meeting: 'baithak',
        report: 'reporta',
        deadline: 'samay-seema',
        urgent: 'turant',
        done: 'ho gaya',
        'sounds good': 'achha lag raha hai',
        'how are you': 'aap kaise hain',
        today: 'aaj',
        tomorrow: 'kal',
        team: 'team',
        work: 'kaam',
        issue: 'samasya',
        ready: 'taiyaar',
    },
    es: {
        hello: 'hola',
        thank: 'gracias',
        thanks: 'gracias',
        please: 'por favor',
        yes: 'sí',
        no: 'no',
        ok: 'de acuerdo',
        okay: 'de acuerdo',
        good: 'bien',
        'good morning': 'buenos días',
        project: 'proyecto',
        meeting: 'reunión',
        report: 'informe',
        deadline: 'plazo',
        urgent: 'urgente',
        done: 'hecho',
        'sounds good': 'suena bien',
        'how are you': '¿cómo estás?',
        today: 'hoy',
        tomorrow: 'mañana',
        team: 'equipo',
        work: 'trabajo',
        issue: 'problema',
        ready: 'listo',
    },
    fr: {
        hello: 'bonjour',
        thank: 'merci',
        thanks: 'merci',
        please: 's\'il vous plaît',
        yes: 'oui',
        no: 'non',
        ok: "d'accord",
        okay: "d'accord",
        good: 'bien',
        'good morning': 'bonjour',
        project: 'projet',
        meeting: 'réunion',
        report: 'rapport',
        deadline: 'échéance',
        urgent: 'urgent',
        done: 'terminé',
        'sounds good': 'ça me va',
        'how are you': 'comment ça va ?',
        today: "aujourd'hui",
        tomorrow: 'demain',
        team: 'équipe',
        work: 'travail',
        issue: 'problème',
        ready: 'prêt',
    },
    de: {
        hello: 'hallo',
        thank: 'danke',
        thanks: 'danke',
        please: 'bitte',
        yes: 'ja',
        no: 'nein',
        ok: 'in Ordnung',
        okay: 'in Ordnung',
        good: 'gut',
        'good morning': 'guten Morgen',
        project: 'Projekt',
        meeting: 'Besprechung',
        report: 'Bericht',
        deadline: 'Frist',
        urgent: 'dringend',
        done: 'erledigt',
        'sounds good': 'hört sich gut an',
        'how are you': 'wie geht es dir?',
        today: 'heute',
        tomorrow: 'morgen',
        team: 'Team',
        work: 'Arbeit',
        issue: 'Problem',
        ready: 'bereit',
    },
    it: {
        hello: 'ciao',
        thank: 'grazie',
        thanks: 'grazie',
        please: 'per favore',
        yes: 'sì',
        no: 'no',
        ok: 'va bene',
        okay: 'va bene',
        good: 'bene',
        'good morning': 'buongiorno',
        project: 'progetto',
        meeting: 'riunione',
        report: 'rapporto',
        deadline: 'scadenza',
        urgent: 'urgente',
        done: 'fatto',
        'sounds good': 'suona bene',
        'how are you': 'come stai?',
        today: 'oggi',
        tomorrow: 'domani',
        team: 'squadra',
        work: 'lavoro',
        issue: 'problema',
        ready: 'pronto',
    },
    pt: {
        hello: 'olá',
        thank: 'obrigado',
        thanks: 'obrigado',
        please: 'por favor',
        yes: 'sim',
        no: 'não',
        ok: 'ok',
        okay: 'ok',
        good: 'bom',
        'good morning': 'bom dia',
        project: 'projeto',
        meeting: 'reunião',
        report: 'relatório',
        deadline: 'prazo',
        urgent: 'urgente',
        done: 'feito',
        'sounds good': 'parece bom',
        'how are you': 'como vai?',
        today: 'hoje',
        tomorrow: 'amanhã',
        team: 'equipe',
        work: 'trabalho',
        issue: 'problema',
        ready: 'pronto',
    },
    ru: {
        hello: 'привет',
        thank: 'спасибо',
        thanks: 'спасибо',
        please: 'пожалуйста',
        yes: 'да',
        no: 'нет',
        ok: 'ладно',
        okay: 'ладно',
        good: 'хорошо',
        'good morning': 'доброе утро',
        project: 'проект',
        meeting: 'встреча',
        report: 'отчёт',
        deadline: 'срок',
        urgent: 'срочно',
        done: 'готово',
        'sounds good': 'звучит хорошо',
        'how are you': 'как дела?',
        today: 'сегодня',
        tomorrow: 'завтра',
        team: 'команда',
        work: 'работа',
        issue: 'проблема',
        ready: 'готов',
    },
    nl: {
        hello: 'hallo',
        thank: 'dank je',
        thanks: 'dank je',
        please: 'alsjeblieft',
        yes: 'ja',
        no: 'nee',
        ok: 'oké',
        okay: 'oké',
        good: 'goed',
        'good morning': 'goedemorgen',
        project: 'project',
        meeting: 'vergadering',
        report: 'rapport',
        deadline: 'deadline',
        urgent: 'dringend',
        done: 'klaar',
        'sounds good': 'klinkt goed',
        'how are you': 'hoe gaat het?',
        today: 'vandaag',
        tomorrow: 'morgen',
        team: 'team',
        work: 'werk',
        issue: 'probleem',
        ready: 'klaar',
    },
    tr: {
        hello: 'merhaba',
        thank: 'teşekkürler',
        thanks: 'teşekkürler',
        please: 'lütfen',
        yes: 'evet',
        no: 'hayır',
        ok: 'tamam',
        okay: 'tamam',
        good: 'iyi',
        'good morning': 'günaydın',
        project: 'proje',
        meeting: 'toplantı',
        report: 'rapor',
        deadline: 'son tarih',
        urgent: 'acil',
        done: 'tamamlandı',
        'sounds good': 'kulağa hoş geliyor',
        'how are you': 'nasılsın?',
        today: 'bugün',
        tomorrow: 'yarın',
        team: 'ekip',
        work: 'iş',
        issue: 'sorun',
        ready: 'hazır',
    },
};
const SCRIPT_LANGUAGES = [
    { code: 'hi', test: /[\u0900-\u097F]/ },
    { code: 'ar', test: /[\u0600-\u06FF]/ },
    { code: 'ru', test: /[\u0400-\u04FF]/ },
    { code: 'ja', test: /[\u3040-\u30FF]|[\u4E00-\u9FFF]/ },
    { code: 'ko', test: /[\uAC00-\uD7AF]/ },
    { code: 'zh', test: /[\u4E00-\u9FFF]/ },
    { code: 'bn', test: /[\u0980-\u09FF]/ },
    { code: 'te', test: /[\u0C00-\u0C7F]/ },
    { code: 'ta', test: /[\u0B80-\u0BFF]/ },
];
let MockTranslationProvider = class MockTranslationProvider {
    constructor() {
        this.name = 'mock';
    }
    async translate(request) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        const text = request.text.trim();
        const detected = this.detectSourceLanguage(text);
        if (detected === request.targetLanguage) {
            return {
                translatedText: text,
                detectedSourceLanguage: detected ?? null,
                provider: this.name,
            };
        }
        const phrases = PHRASES[request.targetLanguage];
        if (!phrases) {
            throw new Error(`Translation into "${request.targetLanguage}" is not supported by the offline provider.`);
        }
        const translated = this.applyDictionary(text, phrases);
        if (translated.trim().toLowerCase() === text.trim().toLowerCase()) {
            return {
                translatedText: text,
                detectedSourceLanguage: detected ?? null,
                provider: this.name,
            };
        }
        return {
            translatedText: translated,
            detectedSourceLanguage: detected ?? null,
            provider: this.name,
        };
    }
    detectSourceLanguage(text) {
        for (const lang of SCRIPT_LANGUAGES) {
            if (lang.test.test(text))
                return lang.code;
        }
        const latinWords = (text.match(/[A-Za-z]+/g) ?? []).length;
        return latinWords >= 2 ? 'en' : null;
    }
    applyDictionary(text, phrases) {
        let out = text;
        const entries = Object.keys(phrases).sort((a, b) => b.length - a.length);
        for (const phrase of entries) {
            const regex = new RegExp(`\\b${this.escapeRegExp(phrase)}\\b`, 'gi');
            if (regex.test(out)) {
                out = out.replace(regex, phrases[phrase]);
            }
        }
        return out;
    }
    escapeRegExp(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
};
exports.MockTranslationProvider = MockTranslationProvider;
exports.MockTranslationProvider = MockTranslationProvider = __decorate([
    (0, common_1.Injectable)()
], MockTranslationProvider);
//# sourceMappingURL=mock-translation.provider.js.map