import { Injectable, Logger } from '@nestjs/common';
import { ApiError, GoogleGenAI } from '@google/genai';

type EmbedPurpose = 'document' | 'query';

/**
 * One Gemini API key (GEMINI_API_KEY, from aistudio.google.com) covers both halves
 * of the assistant: chat answers and embeddings.
 *
 * The free tier is rate-limited per minute, so 429s are retried with backoff
 * instead of failing a whole sync.
 */
@Injectable()
export class GeminiClient {
	private readonly logger = new Logger(GeminiClient.name);
	private client?: GoogleGenAI;

	readonly chatModel = process.env.AI_MODEL || 'gemini-flash-latest';
	/**
	 * Tried in order when the main model is overloaded (503), out of free quota (429) or slow.
	 * Free-tier capacity differs per model and changes by the hour, so a couple of lighter
	 * models from separate pools make an answer far more likely. Comma-separated in env.
	 */
	readonly fallbackChatModels = (process.env.AI_FALLBACK_MODELS || 'gemini-flash-lite-latest,gemini-3.1-flash-lite')
		.split(',')
		.map((m) => m.trim())
		.filter(Boolean);
	readonly embeddingModel = process.env.AI_EMBEDDING_MODEL || 'gemini-embedding-001';
	/** Must match the Atlas vector index; RagService updates the index if this changes. */
	readonly dimensions = Number(process.env.AI_EMBEDDING_DIMS) || 768;

	get enabled(): boolean {
		return !!process.env.GEMINI_API_KEY;
	}

	get ai(): GoogleGenAI {
		if (!this.enabled) throw new Error('GEMINI_API_KEY is not set');
		// Retries are ours (withRetry / chat fallback); the SDK's own 5x backoff would stack on top.
		this.client ??= new GoogleGenAI({
			apiKey: process.env.GEMINI_API_KEY,
			httpOptions: { retryOptions: { attempts: 1 }, timeout: 60_000 },
		});
		return this.client;
	}

	async embed(texts: string[], purpose: EmbedPurpose, attempts = 5): Promise<number[][]> {
		if (texts.length === 0) return [];
		const res = await this.withRetry(() =>
			this.ai.models.embedContent({
				model: this.embeddingModel,
				contents: texts,
				config: {
					taskType: purpose === 'document' ? 'RETRIEVAL_DOCUMENT' : 'RETRIEVAL_QUERY',
					outputDimensionality: this.dimensions,
				},
			}),
			attempts,
		);
		const vectors = (res.embeddings ?? []).map((e) => e.values ?? []);
		if (vectors.length !== texts.length) {
			throw new Error(`Gemini returned ${vectors.length} embeddings for ${texts.length} texts`);
		}
		return vectors;
	}

	/** Retries rate limits (429) and transient server errors (5xx). */
	async withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
		for (let attempt = 0; ; attempt++) {
			try {
				return await fn();
			} catch (err) {
				const retryable = err instanceof ApiError && (err.status === 429 || err.status >= 500);
				if (!retryable || attempt >= attempts - 1) throw err;
				const wait = 15_000 * (attempt + 1);
				this.logger.warn(`Gemini ${(err as ApiError).status}, retrying in ${wait / 1000}s`);
				await new Promise((r) => setTimeout(r, wait));
			}
		}
	}
}
