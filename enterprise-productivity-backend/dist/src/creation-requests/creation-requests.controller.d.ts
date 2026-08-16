import type { AuthObject } from '../auth/auth-object';
import { CreationRequestsService, CreationRequestItem, ReviewResult } from './creation-requests.service';
import { CreateCreationRequestDto } from './dto/create-creation-request.dto';
import { ReviewCreationRequestDto } from './dto/review-creation-request.dto';
export declare class CreationRequestsController {
    private readonly creationRequestsService;
    constructor(creationRequestsService: CreationRequestsService);
    create(auth: AuthObject, dto: CreateCreationRequestDto): Promise<CreationRequestItem>;
    findAll(auth: AuthObject, entityType?: string): Promise<CreationRequestItem[]>;
    findOne(auth: AuthObject, id: string): Promise<CreationRequestItem>;
    approve(auth: AuthObject, id: string, dto: ReviewCreationRequestDto): Promise<ReviewResult>;
    reject(auth: AuthObject, id: string, dto: ReviewCreationRequestDto): Promise<CreationRequestItem>;
}
