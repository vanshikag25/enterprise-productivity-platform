import { Module } from '@nestjs/common';
import { StreamModule } from '../stream/stream.module';
import { MessageSourceService } from './message-source.service';

@Module({
  imports: [StreamModule],
  providers: [MessageSourceService],
  exports: [MessageSourceService],
})
export class MessageSourceModule {}
