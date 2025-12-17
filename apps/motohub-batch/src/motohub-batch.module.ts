import { Module } from '@nestjs/common';
import { MotohubBatchController } from './motohub-batch.controller';
import { MotohubBatchService } from './motohub-batch.service';

@Module({
  imports: [],
  controllers: [MotohubBatchController],
  providers: [MotohubBatchService],
})
export class MotohubBatchModule {}
