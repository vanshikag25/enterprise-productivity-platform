import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { StreamModule } from '../stream/stream.module';
import { ProjectsModule } from '../projects/projects.module';
import { AiSummaryService } from './ai-summary.service';
import { MockAiSummaryProvider } from './providers/mock-ai-summary.provider';
import { AI_SUMMARY_PROVIDER } from './ai-summary.provider';

@Module({
  imports: [DatabaseModule, StreamModule, ProjectsModule],
  providers: [
    AiSummaryService,
    {
      provide: AI_SUMMARY_PROVIDER,
      useClass: MockAiSummaryProvider,
    },
  ],
  exports: [AiSummaryService],
})
export class AiSummaryModule {}
