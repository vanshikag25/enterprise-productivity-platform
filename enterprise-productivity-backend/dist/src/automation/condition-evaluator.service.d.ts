import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { WorkflowCondition } from '../database/schema/workflows.schema';
import { UsersService } from '../users/users.service';
import { ProjectAccessService } from '../projects/project-access.service';
export declare class ConditionEvaluatorService {
    private readonly db;
    private readonly usersService;
    private readonly access;
    constructor(db: NodePgDatabase, usersService: UsersService, access: ProjectAccessService);
    evaluate(conditions: WorkflowCondition[], payload: Record<string, unknown>): Promise<boolean>;
    private buildContext;
    private evaluateOne;
    private eq;
    private compare;
}
