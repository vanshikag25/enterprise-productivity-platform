import { Controller, Get, UseGuards } from '@nestjs/common';
import type { AuthObject } from '@clerk/backend';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { CurrentUser } from './current-user.decorator';

@Controller('clerk-test')
export class ClerkTestController {
  @Get('me')
  @UseGuards(ClerkAuthGuard)
  getMe(@CurrentUser() auth: AuthObject) {
    return {
      status: 'ok',
      message: 'Authenticated successfully',
      auth,
    };
  }
}
