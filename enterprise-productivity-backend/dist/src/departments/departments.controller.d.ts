import type { AuthObject } from '../auth/auth-object';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
export declare class DepartmentsController {
    private readonly departmentsService;
    constructor(departmentsService: DepartmentsService);
    create(auth: AuthObject, dto: CreateDepartmentDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        channelId: string | null;
        description: string | null;
        managerId: string | null;
        memberIds: string[];
        createdBy: string;
    }>;
    findMine(auth: AuthObject): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        channelId: string | null;
        description: string | null;
        managerId: string | null;
        memberIds: string[];
        createdBy: string;
    }[]>;
    findOne(id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        channelId: string | null;
        description: string | null;
        managerId: string | null;
        memberIds: string[];
        createdBy: string;
    }>;
    update(auth: AuthObject, id: string, dto: UpdateDepartmentDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        channelId: string | null;
        description: string | null;
        managerId: string | null;
        memberIds: string[];
        createdBy: string;
    }>;
    remove(auth: AuthObject, id: string): Promise<void>;
    addMember(auth: AuthObject, id: string, memberId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        channelId: string | null;
        description: string | null;
        managerId: string | null;
        memberIds: string[];
        createdBy: string;
    }>;
    removeMember(auth: AuthObject, id: string, memberId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        channelId: string | null;
        description: string | null;
        managerId: string | null;
        memberIds: string[];
        createdBy: string;
    }>;
}
