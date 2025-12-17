import { Injectable } from '@nestjs/common';

@Injectable()
export class MotohubBatchService {
  getHello(): string {
      return 'Welcome to MotoHub BATCH  Server!';
  }
}
