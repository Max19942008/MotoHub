import { Controller, Get } from '@nestjs/common';
import { MotohubBatchService } from './motohub-batch.service';

@Controller()
export class MotohubBatchController {
  constructor(private readonly motohubBatchService: MotohubBatchService) {}

  @Get()
  getHello(): string {
    return this.motohubBatchService.getHello();
  }
}
