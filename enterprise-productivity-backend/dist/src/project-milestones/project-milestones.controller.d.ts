import type { AuthObject } from '@clerk/backend';
import { ProjectMilestonesService } from './project-milestones.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { UpdateMilestoneStatusDto, UpdateMilestoneProgressDto } from './dto/update-milestone.dto';
export declare class ProjectMilestonesController {
    private readonly milestonesService;
    constructor(milestonesService: ProjectMilestonesService);
    findAll(auth: AuthObject, projectId: string, status?: string, sortBy?: string): Promise<import("./project-milestones.service").MilestoneItem[]>;
    create(auth: AuthObject, projectId: string, dto: CreateMilestoneDto): Promise<import("./project-milestones.service").MilestoneItem>;
    update(auth: AuthObject, projectId: string, id: string, dto: UpdateMilestoneDto): Promise<import("./project-milestones.service").MilestoneItem>;
    updateStatus(auth: AuthObject, projectId: string, id: string, dto: UpdateMilestoneStatusDto): Promise<import("./project-milestones.service").MilestoneItem>;
    updateProgress(auth: AuthObject, projectId: string, id: string, dto: UpdateMilestoneProgressDto): Promise<import("./project-milestones.service").MilestoneItem>;
    remove(auth: AuthObject, projectId: string, id: string): Promise<void>;
}
