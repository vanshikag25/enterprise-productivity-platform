import { Module } from '@nestjs/common';
import { StreamModule } from '../stream/stream.module';
import { UsersModule } from '../users/users.module';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';

@Module({
  imports: [StreamModule, UsersModule],
  controllers: [VideoController],
  providers: [VideoService],
})
export class VideoModule {}
