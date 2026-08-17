import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StreamService } from '../stream/stream.service';
import type { VideoTokenDto } from './dto/video-token.dto';
export interface VideoTokenResponse {
    apiKey: string;
    userId: string;
    token: string;
    memberIds: string[];
}
export interface VideoConnectResponse {
    apiKey: string;
    userId: string;
    token: string;
}
export declare class VideoService implements OnModuleInit {
    private readonly configService;
    private readonly streamService;
    private readonly logger;
    private cachedCredentials;
    private cachedJwt;
    constructor(configService: ConfigService, streamService: StreamService);
    onModuleInit(): Promise<void>;
    private ensureCallMembersCanJoinBackstage;
    issueVideoToken(userId: string, role: string | undefined, dto: VideoTokenDto): Promise<VideoTokenResponse>;
    connect(userId: string): Promise<VideoConnectResponse>;
    private resolveChannelMembers;
    private getCredentials;
    private getJwt;
}
