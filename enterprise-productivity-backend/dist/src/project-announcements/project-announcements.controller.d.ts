import type { AuthObject } from '../auth/auth-object';
import { ProjectAnnouncementsService } from './project-announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AddReactionDto, SetPinnedDto } from './dto/announcement-actions.dto';
export declare class ProjectAnnouncementsController {
    private readonly announcementsService;
    constructor(announcementsService: ProjectAnnouncementsService);
    findAll(auth: AuthObject, projectId: string, q?: string): Promise<import("./project-announcements.service").AnnouncementItem[]>;
    create(auth: AuthObject, projectId: string, dto: CreateAnnouncementDto): Promise<import("./project-announcements.service").AnnouncementItem>;
    update(auth: AuthObject, projectId: string, id: string, dto: UpdateAnnouncementDto): Promise<import("./project-announcements.service").AnnouncementItem>;
    setPinned(auth: AuthObject, projectId: string, id: string, dto: SetPinnedDto): Promise<import("./project-announcements.service").AnnouncementItem>;
    remove(auth: AuthObject, projectId: string, id: string): Promise<void>;
    addReaction(auth: AuthObject, projectId: string, id: string, dto: AddReactionDto): Promise<import("./project-announcements.service").AnnouncementItem>;
    removeReaction(auth: AuthObject, projectId: string, id: string, emoji: string): Promise<import("./project-announcements.service").AnnouncementItem>;
}
