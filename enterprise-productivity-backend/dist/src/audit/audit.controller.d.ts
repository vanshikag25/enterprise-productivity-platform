import type { AuthObject } from '../auth/auth-object';
import { UsersService } from '../users/users.service';
import { AuditService } from './audit.service';
import { AuditListQueryDto } from './dto/audit-query.dto';
export declare class AuditController {
    private readonly auditService;
    private readonly usersService;
    constructor(auditService: AuditService, usersService: UsersService);
    listLogs(auth: AuthObject, query: AuditListQueryDto): Promise<import("./audit.types").AuditListResult>;
    actionTypes(): {
        items: ("message_edit" | "message_delete" | "user_join" | "user_leave" | "member_remove" | "role_change" | "channel_create" | "channel_delete" | "moderator_action" | "user_mute" | "user_unmute" | "user_ban" | "user_unban" | "channel_lock" | "channel_unlock")[];
    };
}
