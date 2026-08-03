import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export const DRIZZLE = Symbol('DRIZZLE');

const logger = new Logger('DrizzleProvider');

export const drizzleProvider: Provider = {
  provide: DRIZZLE,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService): Promise<NodePgDatabase> => {
    const connectionString = configService.get<string>('database.url');

    const pool = new Pool({ connectionString });

    // Verify the connection actually works before the app finishes booting.
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      logger.log('PostgreSQL connection established successfully.');
    } finally {
      client.release();
    }

    return drizzle(pool);
  },
};
