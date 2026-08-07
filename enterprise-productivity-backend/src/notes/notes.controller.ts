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
import type { AuthObject } from '@clerk/backend';
import { ClerkAuthGuard } from '../clerk/clerk-auth.guard';
import { CurrentUser } from '../clerk/current-user.decorator';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

function requireUserId(auth: AuthObject): string {
  if (!auth.userId)
    throw new UnauthorizedException('Session has no resolvable userId');
  return auth.userId;
}

@Controller('notes')
@UseGuards(ClerkAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  create(@CurrentUser() auth: AuthObject, @Body() dto: CreateNoteDto) {
    return this.notesService.create(requireUserId(auth), dto);
  }

  @Get()
  findAll(
    @CurrentUser() auth: AuthObject,
    @Query('search') search?: string,
  ) {
    return this.notesService.findAll(requireUserId(auth), search);
  }

  @Get(':id')
  findOne(@CurrentUser() auth: AuthObject, @Param('id') id: string) {
    return this.notesService.findOne(id, requireUserId(auth));
  }

  @Patch(':id')
  update(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.update(id, requireUserId(auth), dto);
  }

  @Delete(':id')
  remove(@CurrentUser() auth: AuthObject, @Param('id') id: string) {
    return this.notesService.remove(id, requireUserId(auth));
  }
}
