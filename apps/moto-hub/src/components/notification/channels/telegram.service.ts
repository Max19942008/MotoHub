import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * Sends messages to a Telegram chat via the Bot API.
 * Configure the following env variables (placeholders for now):
 *   TELEGRAM_BOT_TOKEN  - token from @BotFather
 *   TELEGRAM_CHAT_ID    - the admin chat / group id that receives the message
 */
@Injectable()
export class TelegramService {
	private readonly logger = new Logger('TelegramService');

	constructor(private readonly httpService: HttpService) {}

	public async sendToAdmin(text: string): Promise<boolean> {
		const token = process.env.TELEGRAM_BOT_TOKEN;
		const chatId = process.env.TELEGRAM_CHAT_ID;
		if (!token || !chatId) {
			this.logger.warn('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — skipping Telegram.');
			return false;
		}
		try {
			const url = `https://api.telegram.org/bot${token}/sendMessage`;
			await firstValueFrom(
				this.httpService.post(url, {
					chat_id: chatId,
					text,
					parse_mode: 'HTML',
					disable_web_page_preview: false,
				}),
			);
			this.logger.verbose('Admin Telegram message sent.');
			return true;
		} catch (err: any) {
			this.logger.error(`Failed to send Telegram message: ${err.message}`);
			return false;
		}
	}

	/**
	 * Sends a photo with an HTML caption. Falls back to a plain text message
	 * if the photo cannot be delivered (e.g. bad URL). Best-effort.
	 */
	public async sendPhotoToAdmin(photoUrl: string, caption: string): Promise<boolean> {
		const token = process.env.TELEGRAM_BOT_TOKEN;
		const chatId = process.env.TELEGRAM_CHAT_ID;
		if (!token || !chatId) {
			this.logger.warn('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — skipping Telegram.');
			return false;
		}
		try {
			const url = `https://api.telegram.org/bot${token}/sendPhoto`;
			await firstValueFrom(
				this.httpService.post(url, {
					chat_id: chatId,
					photo: photoUrl,
					// Telegram caption limit is 1024 chars
					caption: caption.length > 1024 ? caption.slice(0, 1021) + '...' : caption,
					parse_mode: 'HTML',
				}),
			);
			this.logger.verbose('Admin Telegram photo sent.');
			return true;
		} catch (err: any) {
			this.logger.error(`Failed to send Telegram photo: ${err.message} — falling back to text.`);
			return await this.sendToAdmin(caption);
		}
	}
}
