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
import { ChannelsService } from './channels.service';
import { CreateChannelDto, UpdateChannelDto } from './dto/create-channel.dto';

function uid(auth: AuthObject): string {
  if (!auth.userId) throw new UnauthorizedException();
  return auth.userId;
}

@Controller('channels')
@UseGuards(JwtAuthGuard)
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post() create(
    @CurrentUser() auth: AuthObject,
    @Body() dto: CreateChannelDto,
  ) {
    return this.channelsService.create(uid(auth), dto);
  }
  @Get() list(@Query('kind') kind: string) {
    return this.channelsService.list(kind);
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.channelsService.findOne(id);
  }
  @Patch(':id') update(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.channelsService.update(id, uid(auth), dto);
  }
  @Delete(':id') remove(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
  ) {
    return this.channelsService.remove(id, uid(auth));
  }
  @Post(':id/join') join(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
  ) {
    return this.channelsService.join(id, uid(auth));
  }
  @Post(':id/leave') leave(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
  ) {
    return this.channelsService.leave(id, uid(auth));
  }
  @Get(':id/members') listMembers(@Param('id') id: string) {
    return this.channelsService.listMembers(id);
  }
  @Post(':id/members/:memberId') addMember(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.channelsService.addMember(id, uid(auth), memberId);
  }
  @Delete(':id/members/:memberId') removeMember(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.channelsService.removeMember(id, uid(auth), memberId);
  }
}
