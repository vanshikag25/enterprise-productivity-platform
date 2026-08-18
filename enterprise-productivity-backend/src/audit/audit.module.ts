import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { StreamModule } from '../stream/stream.module';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { RequestContextMiddleware } from './request-context';

/**
 * Global audit module: the AuditService is injected by the services that
 * perform protected actions (moderation, chat, channels, users) so audit
 * records are written at the point of action, never bypassed. Audit records
 * are append-only (no update/delete API; enforced further by a DB trigger).
 */
@Global()
@Module({
  imports: [DatabaseModule, UsersModule, StreamModule],
  providers: [AuditService, RequestContextMiddleware],
  controllers: [AuditController],
  exports: [AuditService, RequestContextMiddleware],
})
export class AuditModule {}
