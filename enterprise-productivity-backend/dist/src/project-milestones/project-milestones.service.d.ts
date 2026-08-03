import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { type ProjectMilestone } from '../database/schema/project-milestones.schema';
import { StreamService } from '../stream/stream.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectAccessService } from '../projects/project-access.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
export interface MilestoneItem extends ProjectMilestone {
    ownerName: string | null;
}
export declare class ProjectMilestonesService {
    private readonly db;
    private readonly streamService;
    private readonly access;
    private readonly notificationsService;
    private readonly logger;
    constructor(db: NodePgDatabase, streamService: StreamService, access: ProjectAccessService, notificationsService: NotificationsService);
    create(projectId: string, userId: string, dto: CreateMilestoneDto): Promise<MilestoneItem>;
    findAll(projectId: string, userId: string, status?: string, sortBy?: string): Promise<MilestoneItem[]>;
    private orderFor;
    update(projectId: string, userId: string, id: string, dto: UpdateMilestoneDto): Promise<MilestoneItem>;
    updateStatus(projectId: string, userId: string, id: string, status: string): Promise<MilestoneItem>;
    updateProgress(projectId: string, userId: string, id: string, progress: number): Promise<MilestoneItem>;
    remove(projectId: string, userId: string, id: string): Promise<void>;
    private milestoneChannelData;
    private projectMemberIds;
    private notifyMembers;
    private requireInProject;
    private decorateMany;
    private decorate;
}
