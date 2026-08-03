import type { AuthObject } from '@clerk/backend';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto, UpdateMemberRoleDto } from './dto/add-member.dto';
export declare class ProjectsController {
    private readonly projectsService;
    constructor(projectsService: ProjectsService);
    create(auth: AuthObject, dto: CreateProjectDto): Promise<import("./projects.service").ProjectSummary>;
    findAll(auth: AuthObject): Promise<import("./projects.service").ProjectSummary[]>;
    findOne(auth: AuthObject, id: string): Promise<import("./projects.service").ProjectSummary>;
    update(auth: AuthObject, id: string, dto: UpdateProjectDto): Promise<import("./projects.service").ProjectSummary>;
    remove(auth: AuthObject, id: string): Promise<void>;
    listMembers(auth: AuthObject, id: string): Promise<import("./projects.service").ProjectMemberSummary[]>;
    addMember(auth: AuthObject, id: string, dto: AddMemberDto): Promise<import("./projects.service").ProjectMemberSummary[]>;
    updateMemberRole(auth: AuthObject, id: string, memberId: string, dto: UpdateMemberRoleDto): Promise<import("./projects.service").ProjectMemberSummary[]>;
    removeMember(auth: AuthObject, id: string, memberId: string): Promise<import("./projects.service").ProjectMemberSummary[]>;
}
