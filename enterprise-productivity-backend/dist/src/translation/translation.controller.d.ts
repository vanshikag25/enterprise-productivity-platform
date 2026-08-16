import type { AuthObject } from '../auth/auth-object';
import { TranslateMessageDto } from './dto/translate-message.dto';
import { TranslationService, TranslationResponse } from './translation.service';
export declare class TranslationController {
    private readonly translationService;
    constructor(translationService: TranslationService);
    translate(auth: AuthObject, dto: TranslateMessageDto): Promise<TranslationResponse>;
}
