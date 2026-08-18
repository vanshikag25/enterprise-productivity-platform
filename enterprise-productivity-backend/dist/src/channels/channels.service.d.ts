import { StreamService } from '../stream/stream.service';
import { UsersService } from '../users/users.service';
import { DepartmentsService } from '../departments/departments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { CreateChannelDto, UpdateChannelDto } from './dto/create-channel.dto';
export declare class ChannelsService {
    private readonly streamService;
    private readonly usersService;
    private readonly departmentsService;
    private readonly notificationsService;
    private readonly auditService;
    private readonly logger;
    constructor(streamService: StreamService, usersService: UsersService, departmentsService: DepartmentsService, notificationsService: NotificationsService, auditService: AuditService);
    private loadActor;
    private audit;
    private requireRole;
    private toSummary;
    create(userId: string, dto: CreateChannelDto): Promise<{
        id: string | undefined;
        name: string;
        description: string;
        kind: string;
        departmentId: string;
        createdBy: string;
        createdAt: string;
        memberCount: number;
        frozen: boolean;
    }>;
    list(kind: string): Promise<{
        id: string | undefined;
        name: string;
        description: string;
        kind: string;
        departmentId: string;
        createdBy: string;
        createdAt: string;
        memberCount: number;
        frozen: boolean;
    }[]>;
    private getWatchedChannel;
    findOne(id: string): Promise<{
        id: string | undefined;
        name: string;
        description: string;
        kind: string;
        departmentId: string;
        createdBy: string;
        createdAt: string;
        memberCount: number;
        frozen: boolean;
    }>;
    private requireCreatorOrPrivileged;
    update(id: string, userId: string, dto: UpdateChannelDto): Promise<{
        id: string | undefined;
        name: string;
        description: string;
        kind: string;
        departmentId: string;
        createdBy: string;
        createdAt: string;
        memberCount: number;
        frozen: boolean;
    }>;
    remove(id: string, userId: string): Promise<void>;
    join(id: string, userId: string): Promise<{
        id: string | undefined;
        name: string;
        description: string;
        kind: string;
        departmentId: string;
        createdBy: string;
        createdAt: string;
        memberCount: number;
        frozen: boolean;
    }>;
    leave(id: string, userId: string): Promise<{
        id: string | undefined;
        name: string;
        description: string;
        kind: string;
        departmentId: string;
        createdBy: string;
        createdAt: string;
        memberCount: number;
        frozen: boolean;
    }>;
    addMember(id: string, userId: string, memberId: string): Promise<{
        id: string | undefined;
        name: string;
        description: string;
        kind: string;
        departmentId: string;
        createdBy: string;
        createdAt: string;
        memberCount: number;
        frozen: boolean;
    }>;
    removeMember(id: string, userId: string, memberId: string): Promise<{
        id: string | undefined;
        name: string;
        description: string;
        kind: string;
        departmentId: string;
        createdBy: string;
        createdAt: string;
        memberCount: number;
        frozen: boolean;
    }>;
    listMembers(id: string): Promise<{
        id: string | undefined;
        name: string | undefined;
        imageUrl: string | undefined;
    }[]>;
}
