"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.drizzleProvider = exports.DRIZZLE = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const pg_1 = require("pg");
exports.DRIZZLE = Symbol('DRIZZLE');
const logger = new common_1.Logger('DrizzleProvider');
exports.drizzleProvider = {
    provide: exports.DRIZZLE,
    inject: [config_1.ConfigService],
    useFactory: async (configService) => {
        const connectionString = configService.get('database.url');
        const pool = new pg_1.Pool({ connectionString });
        const client = await pool.connect();
        try {
            await client.query('SELECT 1');
            logger.log('PostgreSQL connection established successfully.');
        }
        finally {
            client.release();
        }
        return (0, node_postgres_1.drizzle)(pool);
    },
};
//# sourceMappingURL=drizzle.provider.js.map