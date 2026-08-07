import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Task } from '../database/schema/tasks.schema';
import { StreamService } from '../stream/stream.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
export declare class TasksService {
    private readonly db;
    private readonly streamService;
    private readonly notificationsService;
    private readonly logger;
    constructor(db: NodePgDatabase, streamService: StreamService, notificationsService: NotificationsService);
    create(userId: string, dto: CreateTaskDto): Promise<Task>;
    private linkSourceMessage;
    findBySourceMessage(messageId: string): Promise<Task | null>;
    findAll(): Promise<Task[]>;
    findOne(id: string): Promise<Task>;
    getOrCreateChannel(id: string, userId: string): Promise<{
        channelId: string;
    }>;
    private createTaskChannel;
    update(id: string, userId: string, dto: UpdateTaskDto): Promise<Task>;
    updateStatus(id: string, userId: string, status: string): Promise<Task>;
    remove(id: string, userId: string): Promise<void>;
}
