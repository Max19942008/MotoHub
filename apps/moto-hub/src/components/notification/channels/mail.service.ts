import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Sends e-mail via Gmail SMTP.
 * Configure the following env variables (placeholders for now):
 *   GMAIL_USER          - the Gmail address that sends the mail
 *   GMAIL_APP_PASSWORD  - a Gmail App Password (NOT the account password)
 *   ADMIN_EMAIL         - where admin notifications are delivered
 */
@Injectable()
export class MailService {
	private readonly logger = new Logger('MailService');
	private transporter: nodemailer.Transporter | null = null;

	private getTransporter(): nodemailer.Transporter | null {
		const user = process.env.GMAIL_USER;
		const pass = process.env.GMAIL_APP_PASSWORD;
		if (!user || !pass) {
			this.logger.warn('GMAIL_USER / GMAIL_APP_PASSWORD not set — skipping e-mail.');
			return null;
		}
		if (!this.transporter) {
			this.transporter = nodemailer.createTransport({
				service: 'gmail',
				auth: { user, pass },
				/**
				 * Many hosts — DigitalOcean droplets among them — block outbound 25,
				 * 465 and 587 by default. Without these, a blocked port is not an
				 * error but a two-minute wait on a socket that will never connect.
				 * Fail fast instead and let the caller move on.
				 */
				connectionTimeout: 10_000,
				greetingTimeout: 10_000,
				socketTimeout: 15_000,
			});
		}
		return this.transporter;
	}

	public async sendToAdmin(subject: string, html: string): Promise<boolean> {
		const transporter = this.getTransporter();
		const to = process.env.ADMIN_EMAIL;
		if (!transporter || !to) {
			this.logger.warn('E-mail not sent (missing transporter or ADMIN_EMAIL).');
			return false;
		}
		try {
			await transporter.sendMail({
				from: `"MOTOPRESTO" <${process.env.GMAIL_USER}>`,
				to,
				subject,
				html,
			});
			this.logger.verbose(`Admin e-mail sent: ${subject}`);
			return true;
		} catch (err: any) {
			this.logger.error(`Failed to send admin e-mail: ${err.message}`);
			return false;
		}
	}
}
