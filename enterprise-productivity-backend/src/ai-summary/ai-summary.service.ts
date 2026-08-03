import { Inject, Injectable } from '@nestjs/common';
import { count, desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import { projectAnnouncements } from '../database/schema/project-announcements.schema';
import { projectMilestones } from '../database/schema/project-milestones.schema';
import { projectMembers } from '../database/schema/projects.schema';
import { StreamService } from '../stream/stream.service';
import { ProjectsService } from '../projects/projects.service';
import { ProjectAccessService } from '../projects/project-access.service';
import {
  AI_SUMMARY_PROVIDER,
  AiSummaryContext,
  AiSummaryProvider,
  AiSummaryResult,
} from './ai-summary.provider';

@Injectable()
export class AiSummaryService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly streamService: StreamService,
    private readonly projectsService: ProjectsService,
    private readonly access: ProjectAccessService,
    @Inject(AI_SUMMARY_PROVIDER) private readonly provider: AiSummaryProvider,
  ) {}

  async generate(projectId: string, userId: string): Promise<AiSummaryResult> {
    await this.access.assertMember(projectId, userId);
    const project = await this.projectsService.requireProject(projectId);

    const [memberCountRow] = await this.db
      .select({ n: count(projectMembers.userId) })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));

    const [announcements, milestones, recentMessages] = await Promise.all([
      this.db
        .select()
        .from(projectAnnouncements)
        .where(eq(projectAnnouncements.projectId, projectId))
        .orderBy(desc(projectAnnouncements.createdAt))
        .limit(10),
      this.db
        .select({
          title: projectMilestones.title,
          status: projectMilestones.status,
          progress: projectMilestones.progress,
        })
        .from(projectMilestones)
        .where(eq(projectMilestones.projectId, projectId)),
      this.fetchRecentMessages(project.channelId),
    ]);

    const context: AiSummaryContext = {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
      },
      memberCount: memberCountRow?.n ?? 0,
      announcements: announcements.map((a) => ({
        title: a.title,
        body: a.body,
        author: a.authorId,
      })),
      milestones,
      recentMessages,
    };

    return this.provider.generate(context);
  }

  private async fetchRecentMessages(channelId: string | null) {
    if (!channelId) return [];
    try {
      const channel = this.streamService
        .getClient()
        .channel('messaging', channelId);
      const response = await channel.query({ messages: { limit: 30 } });
      return response.messages.map((m) => ({
        user: m.user?.name ?? m.user?.id ?? 'Unknown',
        text: m.text ?? '',
        createdAt: m.created_at ?? null,
      }));
    } catch {
      return [];
    }
  }
}
