import type { AuthObject } from '../auth/auth-object';
import { StreamService } from './stream.service';
export declare class StreamController {
    private readonly streamService;
    constructor(streamService: StreamService);
    getToken(auth: AuthObject): {
        token: string;
    };
}
