export declare class CreatePollDto {
    channelId: string;
    question: string;
    options: string[];
    multipleAnswers?: boolean;
    anonymous?: boolean;
    deadline?: string;
}
