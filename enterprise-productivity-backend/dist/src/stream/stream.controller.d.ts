import type { AuthObject } from '@clerk/backend';
import { StreamService } from './stream.service';
export declare class StreamController {
    private readonly streamService;
    constructor(streamService: StreamService);
    getToken(auth: AuthObject): {
        token: string;
    };
}
