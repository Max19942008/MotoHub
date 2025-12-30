import { Module } from '@nestjs/common';
import { BatchController } from './batch.controller';
import { MotohubBatchService } from './batch.service';
import {ConfigModule} from "@nestjs/config";
import { DatabaseModule } from './database/database.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ConfigModule.forRoot(), DatabaseModule,ScheduleModule.forRoot()],
  controllers: [BatchController],
  providers: [MotohubBatchService],
})
export class BatchModule {}
