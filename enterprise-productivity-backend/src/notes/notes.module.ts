import { Module } from '@nestjs/common';
import { NotesService } from './notes.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [NotesService],
  exports: [NotesService],
})
export class NotesModule {}
