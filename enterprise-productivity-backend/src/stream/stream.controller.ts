import {
  Controller,
  Get,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthObject } from '@clerk/backend';
import { ClerkAuthGuard } from '../clerk/clerk-auth.guard';
import { CurrentUser } from '../clerk/current-user.decorator';
import { StreamService } from './stream.service';

@Controller('stream')
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  @Get('token')
  @UseGuards(ClerkAuthGuard)
  getToken(@CurrentUser() auth: AuthObject): { token: string } {
    if (!auth.userId) {
      throw new UnauthorizedException('Session has no resolvable userId');
    }

    const token = this.streamService.createUserToken(auth.userId);

    return { token };
  }
}
