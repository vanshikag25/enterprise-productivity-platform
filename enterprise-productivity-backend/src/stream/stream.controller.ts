import {
  Controller,
  Get,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthObject } from '../auth/auth-object';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { StreamService } from './stream.service';

@Controller('stream')
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  @Get('token')
  @UseGuards(JwtAuthGuard)
  getToken(@CurrentUser() auth: AuthObject): { token: string } {
    if (!auth.userId) {
      throw new UnauthorizedException('Session has no resolvable userId');
    }

    const token = this.streamService.createUserToken(auth.userId);

    return { token };
  }
}
