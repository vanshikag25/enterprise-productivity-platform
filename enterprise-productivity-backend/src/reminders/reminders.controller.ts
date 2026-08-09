import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthObject } from '../auth/auth-object';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RemindersService } from './reminders.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';

function requireUserId(auth: AuthObject): string {
  if (!auth.userId)
    throw new UnauthorizedException('Session has no resolvable userId');
  return auth.userId;
}

@Controller('reminders')
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  create(@CurrentUser() auth: AuthObject, @Body() dto: CreateReminderDto) {
    return this.remindersService.create(requireUserId(auth), dto);
  }

  @Get()
  findAll(
    @CurrentUser() auth: AuthObject,
    @Query('includeTriggered') includeTriggered?: string,
  ) {
    return this.remindersService.findAll(
      requireUserId(auth),
      includeTriggered === 'true',
    );
  }

  @Get(':id')
  findOne(@CurrentUser() auth: AuthObject, @Param('id') id: string) {
    return this.remindersService.findOne(id, requireUserId(auth));
  }

  @Patch(':id')
  update(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
    @Body() dto: UpdateReminderDto,
  ) {
    return this.remindersService.update(id, requireUserId(auth), dto);
  }

  @Post(':id/trigger')
  trigger(@CurrentUser() auth: AuthObject, @Param('id') id: string) {
    return this.remindersService.trigger(id, requireUserId(auth));
  }

  @Delete(':id')
  remove(@CurrentUser() auth: AuthObject, @Param('id') id: string) {
    return this.remindersService.remove(id, requireUserId(auth));
  }
}
