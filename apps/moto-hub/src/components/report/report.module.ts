import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportResolver } from './report.resolver';
import { ReportService } from './report.service';
import ReportSchema from '../../schemas/Report.model';
import { AuthModule } from '../auth/auth.module';

@Module({
	imports: [MongooseModule.forFeature([{ name: 'Report', schema: ReportSchema }]), AuthModule],
	providers: [ReportResolver, ReportService],
	exports: [ReportService],
})
export class ReportModule {}
