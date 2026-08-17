import type { Request } from 'express';
import type { AuthObject } from '../auth/auth-object';
import { VideoTokenDto } from './dto/video-token.dto';
import { VideoConnectResponse, VideoService, VideoTokenResponse } from './video.service';
export declare class VideoController {
    private readonly videoService;
    constructor(videoService: VideoService);
    connect(auth: AuthObject): Promise<VideoConnectResponse>;
    issueToken(auth: AuthObject, request: Request & {
        user?: {
            role?: string;
        } | undefined;
    }, dto: VideoTokenDto): Promise<VideoTokenResponse>;
}
