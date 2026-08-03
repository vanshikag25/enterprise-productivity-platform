declare const _default: () => {
    port: number;
    nodeEnv: string;
    corsOrigin: string;
    clerk: {
        secretKey: string | undefined;
        publishableKey: string | undefined;
    };
    database: {
        url: string | undefined;
    };
    stream: {
        apiKey: string | undefined;
        secret: string | undefined;
    };
};
export default _default;
