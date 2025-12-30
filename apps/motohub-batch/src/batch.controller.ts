import { Controller, Get } from '@nestjs/common';
import { MotohubBatchService } from './batch.service';

@Controller()
export class BatchController {
  constructor(private readonly motohubBatchService: MotohubBatchService) {}

  @Get()
  getHello(): string {
    return this.motohubBatchService.getHello();
  }
}
