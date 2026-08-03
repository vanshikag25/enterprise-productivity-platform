import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  check(): { status: string; message: string } {
    return {
      status: 'ok',
      message: 'Backend is running',
    };
  }
}
