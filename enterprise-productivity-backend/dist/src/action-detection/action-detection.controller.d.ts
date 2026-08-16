import type { AuthObject } from '../auth/auth-object';
import { DetectActionsDto } from './dto/detect-actions.dto';
import { ResolveActionDto } from './dto/resolve-action.dto';
import { ActionDetectionService, DetectedActionItem } from './action-detection.service';
export declare class ActionDetectionController {
    private readonly actionDetectionService;
    constructor(actionDetectionService: ActionDetectionService);
    analyze(auth: AuthObject, dto: DetectActionsDto): Promise<DetectedActionItem[]>;
    list(auth: AuthObject, channelId: string): Promise<DetectedActionItem[]>;
    findOne(auth: AuthObject, id: string): Promise<DetectedActionItem>;
    dismiss(auth: AuthObject, id: string): Promise<DetectedActionItem>;
    resolve(auth: AuthObject, id: string, dto: ResolveActionDto): Promise<DetectedActionItem>;
}
