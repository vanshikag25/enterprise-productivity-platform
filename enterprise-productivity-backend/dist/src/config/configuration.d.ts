declare const _default: () => {
    port: number;
    nodeEnv: string;
    corsOrigin: string;
    auth: {
        jwtSecret: string;
        jwtExpiresIn: string;
    };
    database: {
        url: string | undefined;
    };
    stream: {
        apiKey: string | undefined;
        secret: string | undefined;
    };
    video: {
        apiKey: string | undefined;
        secret: string | undefined;
    };
    ai: {
        provider: string;
        openaiApiKey: string | undefined;
        openaiModel: string;
        openaiBaseUrl: string;
    };
    sentiment: {
        enabled: boolean;
    };
    summaries: {
        backfillIntervalMs: number;
    };
    actionDetection: {
        backfillIntervalMs: number;
    };
};
export default _default;
