import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { StreamService } from '../stream/stream.service';
import { ProjectsService } from '../projects/projects.service';
import { ProjectAccessService } from '../projects/project-access.service';
import { SentimentProvider } from './sentiment.provider';
export declare const SENTIMENT_SETTING_KEY = "sentiment.enabled";
export interface SentimentInsight {
    messageId: string;
    userId: string | null;
    userName: string | null;
    text: string;
    createdAt: string | null;
    category: 'positive' | 'frustration' | 'blocker' | 'neutral';
    confidence: number;
    url: string;
}
export interface SentimentAnalysisResponse {
    project: {
        id: string;
        name: string;
        channelId: string | null;
    };
    enabled: boolean;
    insufficient: boolean;
    analyzedCount: number;
    provider: string;
    overall: {
        label: string;
        score: number;
    } | null;
    positives: SentimentInsight[];
    frustrations: SentimentInsight[];
    blockers: SentimentInsight[];
    trend: {
        date: string;
        positive: number;
        frustration: number;
        neutral: number;
    }[];
}
export declare class SentimentService {
    private readonly db;
    private readonly configService;
    private readonly streamService;
    private readonly projectsService;
    private readonly access;
    private readonly provider;
    private readonly logger;
    constructor(db: NodePgDatabase, configService: ConfigService, streamService: StreamService, projectsService: ProjectsService, access: ProjectAccessService, provider: SentimentProvider);
    getEnabled(): Promise<boolean>;
    setEnabled(userId: string, enabled: boolean): Promise<boolean>;
    analyzeProject(userId: string, projectId: string, days: number): Promise<SentimentAnalysisResponse>;
    private toInsight;
    private runAnalysis;
    private fetchMessages;
}
