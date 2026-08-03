import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { type ProjectAnnouncement } from '../database/schema/project-announcements.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectAccessService } from '../projects/project-access.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
export interface AnnouncementReactionSummary {
    emoji: string;
    count: number;
    reactedByMe: boolean;
}
export interface AnnouncementItem extends ProjectAnnouncement {
    authorName: string | null;
    reactions: AnnouncementReactionSummary[];
    reactionCount: number;
}
export declare class ProjectAnnouncementsService {
    private readonly db;
    private readonly access;
    private readonly notificationsService;
    constructor(db: NodePgDatabase, access: ProjectAccessService, notificationsService: NotificationsService);
    create(projectId: string, userId: string, dto: CreateAnnouncementDto): Promise<AnnouncementItem>;
    findAll(projectId: string, userId: string, q?: string): Promise<AnnouncementItem[]>;
    update(projectId: string, userId: string, id: string, dto: UpdateAnnouncementDto): Promise<AnnouncementItem>;
    setPinned(projectId: string, userId: string, id: string, isPinned: boolean): Promise<AnnouncementItem>;
    remove(projectId: string, userId: string, id: string): Promise<void>;
    addReaction(projectId: string, userId: string, id: string, emoji: string): Promise<AnnouncementItem>;
    removeReaction(projectId: string, userId: string, id: string, emoji: string): Promise<AnnouncementItem>;
    private requireInProject;
    private decorateMany;
    private decorate;
}
