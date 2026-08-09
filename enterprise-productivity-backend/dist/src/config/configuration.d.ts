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
};
export default _default;
