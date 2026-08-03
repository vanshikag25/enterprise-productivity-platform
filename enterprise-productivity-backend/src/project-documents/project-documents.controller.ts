import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthObject } from '@clerk/backend';
import type { Response } from 'express';
import { ClerkAuthGuard } from '../clerk/clerk-auth.guard';
import { CurrentUser } from '../clerk/current-user.decorator';
import { ProjectDocumentsService } from './project-documents.service';
import {
  documentFileFilter,
  documentStorage,
  MAX_FILE_SIZE_BYTES,
} from './document-storage';

function requireUserId(auth: AuthObject): string {
  if (!auth.userId)
    throw new UnauthorizedException('Session has no resolvable userId');
  return auth.userId;
}

@Controller('projects/:projectId/documents')
@UseGuards(ClerkAuthGuard)
export class ProjectDocumentsController {
  constructor(private readonly documentsService: ProjectDocumentsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: documentStorage,
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: documentFileFilter,
    }),
  )
  upload(
    @CurrentUser() auth: AuthObject,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentsService.upload(projectId, requireUserId(auth), file);
  }

  @Get()
  findAll(
    @CurrentUser() auth: AuthObject,
    @Param('projectId') projectId: string,
    @Query('q') q?: string,
  ) {
    return this.documentsService.findAll(projectId, requireUserId(auth), q);
  }

  @Get(':id/download')
  download(
    @CurrentUser() auth: AuthObject,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.documentsService.getFile(
      projectId,
      requireUserId(auth),
      id,
      res,
      false,
    );
  }

  @Get(':id/preview')
  preview(
    @CurrentUser() auth: AuthObject,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.documentsService.getFile(
      projectId,
      requireUserId(auth),
      id,
      res,
      true,
    );
  }

  @Delete(':id')
  remove(
    @CurrentUser() auth: AuthObject,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.documentsService.remove(projectId, requireUserId(auth), id);
  }
}
