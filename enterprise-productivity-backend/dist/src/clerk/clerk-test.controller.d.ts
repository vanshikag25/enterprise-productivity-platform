import type { AuthObject } from '@clerk/backend';
export declare class ClerkTestController {
    getMe(auth: AuthObject): {
        status: string;
        message: string;
        auth: any;
    };
}
