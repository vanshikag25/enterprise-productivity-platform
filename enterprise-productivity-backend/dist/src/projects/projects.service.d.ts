import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { type Project, type ProjectMemberRole } from '../database/schema/projects.schema';
import { StreamService } from '../stream/stream.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectAccessService } from './project-access.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
export interface ProjectMemberSummary {
    id: string;
    name: string | null;
    email: string | null;
    imageUrl: string | null;
    role: ProjectMemberRole;
}
export interface ProjectSummary {
    id: string;
    name: string;
    description: string | null;
    avatarUrl: string | null;
    ownerId: string;
    channelId: string | null;
    memberCount: number;
    currentUserRole: ProjectMemberRole | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare class ProjectsService {
    private readonly db;
    private readonly streamService;
    private readonly usersService;
    private readonly access;
    private readonly notificationsService;
    private readonly logger;
    constructor(db: NodePgDatabase, streamService: StreamService, usersService: UsersService, access: ProjectAccessService, notificationsService: NotificationsService);
    create(userId: string, dto: CreateProjectDto): Promise<ProjectSummary>;
    private projectChannelData;
    findAll(userId: string): Promise<ProjectSummary[]>;
    findOne(id: string, userId: string): Promise<ProjectSummary>;
    requireProject(id: string): Promise<Project>;
    private summary;
    update(id: string, userId: string, dto: UpdateProjectDto): Promise<ProjectSummary>;
    remove(id: string, userId: string): Promise<void>;
    listMembers(id: string, userId: string): Promise<ProjectMemberSummary[]>;
    addMember(id: string, userId: string, memberId: string, role?: ProjectMemberRole): Promise<ProjectMemberSummary[]>;
    removeMember(id: string, userId: string, memberId: string): Promise<ProjectMemberSummary[]>;
    updateMemberRole(id: string, userId: string, memberId: string, role: ProjectMemberRole): Promise<ProjectMemberSummary[]>;
    private pushChannelDetails;
    private pushChannelMemberIds;
    memberRoleFor(id: string, userId: string): Promise<ProjectMemberRole | null>;
    getAccess(): ProjectAccessService;
}
