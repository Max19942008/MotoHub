import { Module } from '@nestjs/common';
import { BatchController } from './batch.controller';
import { ConfigModule} from "@nestjs/config";
import { DatabaseModule } from './database/database.module';
import { ScheduleModule } from '@nestjs/schedule';
import { BatchService } from './batch.service';
import { MongooseModule } from '@nestjs/mongoose';
import MemberSchema from 'apps/moto-hub/src/schemas/Member.model';
import PropertySchema from 'apps/moto-hub/src/schemas/Property.model';


@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule, 
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([{ name: "Property", schema: PropertySchema}]),
    MongooseModule.forFeature([{ name: "Member", schema: MemberSchema}])
  ],
  controllers: [BatchController],
  providers: [BatchService],
})
export class BatchModule {}
