import { Module } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { StreamModule } from '../stream/stream.module';

@Module({
  imports: [DatabaseModule, UsersModule, StreamModule],
  providers: [DepartmentsService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
