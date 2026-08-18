import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { StreamModule } from '../stream/stream.module';
import { UsersModule } from '../users/users.module';
import { AnalyticsService } from './analytics.service';
import { AnalyticsScopeService } from './analytics-scope.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [DatabaseModule, StreamModule, UsersModule],
  providers: [AnalyticsScopeService, AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
