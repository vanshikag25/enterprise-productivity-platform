import { Module } from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [BookmarksService],
  exports: [BookmarksService],
})
export class BookmarksModule {}
