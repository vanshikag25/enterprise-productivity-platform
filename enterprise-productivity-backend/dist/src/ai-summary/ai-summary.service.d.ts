import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { StreamService } from '../stream/stream.service';
import { ProjectsService } from '../projects/projects.service';
import { ProjectAccessService } from '../projects/project-access.service';
import { AiSummaryProvider, AiSummaryResult } from './ai-summary.provider';
export declare class AiSummaryService {
    private readonly db;
    private readonly streamService;
    private readonly projectsService;
    private readonly access;
    private readonly provider;
    constructor(db: NodePgDatabase, streamService: StreamService, projectsService: ProjectsService, access: ProjectAccessService, provider: AiSummaryProvider);
    generate(projectId: string, userId: string): Promise<AiSummaryResult>;
    private fetchRecentMessages;
}
