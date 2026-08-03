import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Meeting } from '../database/schema/meetings.schema';
import { StreamService } from '../stream/stream.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
export declare class MeetingsService {
    private readonly db;
    private readonly streamService;
    private readonly notificationsService;
    private readonly logger;
    constructor(db: NodePgDatabase, streamService: StreamService, notificationsService: NotificationsService);
    private validateTimes;
    create(userId: string, dto: CreateMeetingDto): Promise<Meeting>;
    findAll(): Promise<Meeting[]>;
    findOne(id: string): Promise<Meeting>;
    update(id: string, userId: string, dto: UpdateMeetingDto): Promise<Meeting>;
    remove(id: string, userId: string): Promise<void>;
    join(id: string, userId: string): Promise<Meeting>;
    leave(id: string, userId: string): Promise<Meeting>;
}
