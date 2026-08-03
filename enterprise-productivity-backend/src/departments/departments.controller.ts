import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthObject } from '@clerk/backend';
import { ClerkAuthGuard } from '../clerk/clerk-auth.guard';
import { CurrentUser } from '../clerk/current-user.decorator';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

function uid(auth: AuthObject): string {
  if (!auth.userId) throw new UnauthorizedException();
  return auth.userId;
}

@Controller('departments')
@UseGuards(ClerkAuthGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post() create(
    @CurrentUser() auth: AuthObject,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.departmentsService.create(uid(auth), dto);
  }
  @Get('mine') findMine(@CurrentUser() auth: AuthObject) {
    return this.departmentsService.findMine(uid(auth));
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }
  @Patch(':id') update(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(id, uid(auth), dto);
  }
  @Delete(':id') remove(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
  ) {
    return this.departmentsService.remove(id, uid(auth));
  }
  @Post(':id/members/:memberId') addMember(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.departmentsService.addMember(id, uid(auth), memberId);
  }
  @Delete(':id/members/:memberId') removeMember(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.departmentsService.removeMember(id, uid(auth), memberId);
  }
}
