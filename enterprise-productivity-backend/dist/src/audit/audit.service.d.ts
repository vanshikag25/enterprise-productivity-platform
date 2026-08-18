import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { type AuditActionType, type AuditEvent } from '../database/schema/audit-logs.schema';
import type { AuditListParams, AuditListResult, RecordAuditInput } from './audit.types';
type PgTx = Parameters<Parameters<NodePgDatabase['transaction']>[0]>[0];
export declare class AuditService {
    private readonly db;
    constructor(db: NodePgDatabase);
    record(input: RecordAuditInput, options?: {
        tx?: PgTx;
    }): Promise<AuditEvent>;
    actionTypes(): AuditActionType[];
    listLogs(actor: {
        role: string;
    }, params: AuditListParams): Promise<AuditListResult>;
}
export {};
