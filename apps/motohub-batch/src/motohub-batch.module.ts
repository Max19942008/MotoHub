import { Module } from '@nestjs/common';
import { MotohubBatchController } from './motohub-batch.controller';
import { MotohubBatchService } from './motohub-batch.service';
import {ConfigModule} from "@nestjs/config";

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [MotohubBatchController],
  providers: [MotohubBatchService],
})
export class MotohubBatchModule {}
