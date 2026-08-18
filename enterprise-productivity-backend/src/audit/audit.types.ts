import type { UserRole } from '../rbac/roles';
import type {
  AuditActionType,
  AuditResourceType,
} from '../database/schema/audit-logs.schema';

export interface RecordAuditInput {
  actionType: AuditActionType;
  actorId: string;
  actorRole: UserRole;
  actorName?: string | null;
  targetUserId?: string | null;
  targetUserName?: string | null;
  resourceType: AuditResourceType;
  resourceId?: string | null;
  resourceName?: string | null;
  channelId?: string | null;
  projectId?: string | null;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  reason?: string | null;
}

export interface AuditListParams {
  page: number;
  limit: number;
  actionType?: string;
  actorId?: string;
  channelId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sort?: 'newest' | 'oldest';
}

export interface AuditListResult {
  items: AuditEventDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditEventDto {
  id: string;
  actionType: AuditActionType;
  actorId: string;
  actorRole: UserRole;
  actorName: string | null;
  targetUserId: string | null;
  targetUserName: string | null;
  resourceType: AuditResourceType;
  resourceId: string | null;
  resourceName: string | null;
  channelId: string | null;
  projectId: string | null;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  reason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}
