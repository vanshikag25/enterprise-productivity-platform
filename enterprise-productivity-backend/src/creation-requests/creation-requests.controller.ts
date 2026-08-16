import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthObject } from '../auth/auth-object';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  CreationRequestsService,
  CreationRequestItem,
  ReviewResult,
} from './creation-requests.service';
import { CreateCreationRequestDto } from './dto/create-creation-request.dto';
import { ReviewCreationRequestDto } from './dto/review-creation-request.dto';

function requireUserId(auth: AuthObject): string {
  if (!auth.userId)
    throw new UnauthorizedException('Session has no resolvable userId');
  return auth.userId;
}

@Controller('creation-requests')
@UseGuards(JwtAuthGuard)
export class CreationRequestsController {
  constructor(
    private readonly creationRequestsService: CreationRequestsService,
  ) {}

  /** Any member can propose a task/meeting creation. */
  @Post()
  create(
    @CurrentUser() auth: AuthObject,
    @Body() dto: CreateCreationRequestDto,
  ): Promise<CreationRequestItem> {
    return this.creationRequestsService.create(requireUserId(auth), dto);
  }

  /** All requests (team leads) or the caller's own requests (everyone else). */
  @Get()
  findAll(
    @CurrentUser() auth: AuthObject,
    @Query('entityType') entityType?: string,
  ): Promise<CreationRequestItem[]> {
    const filter =
      entityType === 'task' || entityType === 'meeting'
        ? entityType
        : undefined;
    return this.creationRequestsService.findAll(
      requireUserId(auth),
      filter,
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
  ): Promise<CreationRequestItem> {
    return this.creationRequestsService.findOne(id, requireUserId(auth));
  }

  /** Approves and creates the entity (team_lead+). */
  @Post(':id/approve')
  approve(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
    @Body() dto: ReviewCreationRequestDto,
  ): Promise<ReviewResult> {
    return this.creationRequestsService.approve(
      id,
      requireUserId(auth),
      dto,
    );
  }

  /** Rejects the request (team_lead+). */
  @Post(':id/reject')
  reject(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
    @Body() dto: ReviewCreationRequestDto,
  ): Promise<CreationRequestItem> {
    return this.creationRequestsService.reject(
      id,
      requireUserId(auth),
      dto,
    );
  }
}