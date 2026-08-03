import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ProjectsModule } from '../projects/projects.module';
import { ProjectDocumentsService } from './project-documents.service';

@Module({
  imports: [DatabaseModule, ProjectsModule],
  providers: [ProjectDocumentsService],
  exports: [ProjectDocumentsService],
})
export class ProjectDocumentsModule {}
