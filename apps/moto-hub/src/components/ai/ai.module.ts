import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import AiEmbeddingSchema from '../../schemas/AiEmbedding.model';
import AiReportSchema from '../../schemas/AiReport.model';
import { AuthModule } from '../auth/auth.module';
import { AiResolver } from './ai.resolver';
import { AiService } from './ai.service';
import { RagService } from './rag.service';
import { GeminiClient } from './gemini.client';

/**
 * MotoHub Assistant: RAG over listings, parts and community articles.
 * Env: GEMINI_API_KEY (required to enable),
 * optional AI_MODEL, AI_EMBEDDING_MODEL, AI_EMBEDDING_DIMS, AI_SYNC_MINUTES, AI_RATE_LIMIT.
 */
@Module({
	imports: [MongooseModule.forFeature([
			{ name: 'AiEmbedding', schema: AiEmbeddingSchema },
			{ name: 'AiReport', schema: AiReportSchema },
		]), AuthModule],
	providers: [AiResolver, AiService, RagService, GeminiClient],
})
export class AiModule {}
