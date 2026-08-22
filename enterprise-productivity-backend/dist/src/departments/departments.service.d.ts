import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Department } from '../database/schema/departments.schema';
import { UsersService } from '../users/users.service';
import { StreamService } from '../stream/stream.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
export declare class DepartmentsService {
    private readonly db;
    private readonly usersService;
    private readonly streamService;
    constructor(db: NodePgDatabase, usersService: UsersService, streamService: StreamService);
    private ensureDepartmentSchema;
    private requireRole;
    private syncChannelMembership;
    create(userId: string, dto: CreateDepartmentDto): Promise<Department>;
    findMine(userId: string): Promise<Department[]>;
    findOne(id: string): Promise<Department>;
    update(id: string, userId: string, dto: UpdateDepartmentDto): Promise<Department>;
    remove(id: string, userId: string): Promise<void>;
    addMember(id: string, userId: string, memberId: string): Promise<Department>;
    removeMember(id: string, userId: string, memberId: string): Promise<Department>;
    setChannelId(id: string, channelId: string): Promise<void>;
}
