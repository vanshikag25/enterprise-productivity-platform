import { ActionDetectionContext, ActionDetectionProvider, ActionDetectionResult } from '../action-detection.provider';
export declare class MockActionDetectionProvider implements ActionDetectionProvider {
    readonly name = "mock";
    private readonly logger;
    detect(context: ActionDetectionContext): Promise<ActionDetectionResult>;
    private detectCues;
    private detectTask;
    private detectMeeting;
    private detectDeadline;
    private detectReminder;
    private detectDecision;
    private detectFollowUp;
    private extractTitle;
    private snippet;
    private extractTime;
    private plusOneHour;
    private parseDate;
    private inOneHour;
    private inOneWeek;
    private defaultEndOfWeek;
}
