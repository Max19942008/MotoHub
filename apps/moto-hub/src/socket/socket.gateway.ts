import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'ws';
import * as WebSocket from 'ws';
import * as url from 'url';
import { AuthService } from '../components/auth/auth.service';
import { Member } from '../libs/dto/member/member';

/** What other chat users get to see about a sender — never the whole token payload. */
interface ChatMember {
	_id: string;
	memberNick: string;
	memberImage?: string;
	memberType?: string;
}

interface MessagePayload {
	event: 'message';
	text: string;
	memberData: ChatMember | null;
	createdAt: string;
}

interface InfoPayload {
	event: 'info';
	totalClients: number;
	memberData: ChatMember | null;
	action: 'joined' | 'left';
}

const HISTORY_SIZE = 20;
const MAX_TEXT_LENGTH = 500;

@WebSocketGateway({ transports: ['websocket'], secure: false })
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
	private logger: Logger = new Logger('SocketEventsGateWay');
	private clientsAuthMap = new Map<WebSocket, ChatMember | null>();
	private messageList: MessagePayload[] = [];

	constructor(private authService: AuthService) {}

	@WebSocketServer()
	server: Server;

	public afterInit() {
		this.logger.verbose('WebSocket Server Initialized');
	}

	private async retrieveAuth(req: any): Promise<ChatMember | null> {
		try {
			const { token } = url.parse(req.url, true).query;
			if (!token || typeof token !== 'string') return null;
			const member: Member = await this.authService.verifyToken(token);
			if (!member) return null;
			return {
				_id: String(member._id),
				memberNick: member.memberNick,
				memberImage: member.memberImage,
				memberType: member.memberType,
			};
		} catch (err) {
			return null;
		}
	}

	/** Counted from the live socket set, so it cannot drift the way a ++/-- counter can. */
	private get totalClients(): number {
		return this.clientsAuthMap.size;
	}

	public async handleConnection(client: WebSocket, req: any) {
		const authMember = await this.retrieveAuth(req);
		this.clientsAuthMap.set(client, authMember);

		this.logger.verbose(`Connection [${authMember?.memberNick ?? 'Guest'}] & Total [${this.totalClients}]`);

		this.emitMessage({ event: 'info', totalClients: this.totalClients, memberData: authMember, action: 'joined' });
		client.send(JSON.stringify({ event: 'getMessages', list: this.messageList }));
	}

	public handleDisconnect(client: WebSocket) {
		const authMember = this.clientsAuthMap.get(client) ?? null;
		this.clientsAuthMap.delete(client);

		this.logger.verbose(`DisConnection [${authMember?.memberNick ?? 'Guest'}] & Total [${this.totalClients}]`);

		this.broadcastMessage(client, { event: 'info', totalClients: this.totalClients, memberData: authMember, action: 'left' });
	}

	@SubscribeMessage('message')
	public async handleMessage(client: WebSocket, payload: unknown): Promise<void> {
		const text = typeof payload === 'string' ? payload.trim().slice(0, MAX_TEXT_LENGTH) : '';
		if (!text) return;

		const authMember = this.clientsAuthMap.get(client) ?? null;
		const newMessage: MessagePayload = {
			event: 'message',
			text,
			memberData: authMember,
			createdAt: new Date().toISOString(),
		};

		this.logger.verbose(`NEW MESSAGE [${authMember?.memberNick ?? 'Guest'}] ${text}`);

		this.messageList.push(newMessage);
		if (this.messageList.length > HISTORY_SIZE) this.messageList.splice(0, this.messageList.length - HISTORY_SIZE);

		this.emitMessage(newMessage);
	}

	private broadcastMessage(sender: WebSocket, message: InfoPayload | MessagePayload) {
		this.server.clients.forEach((client) => {
			if (client !== sender && client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(message));
			}
		});
	}

	private emitMessage(message: InfoPayload | MessagePayload) {
		this.server.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(message));
			}
		});
	}
}
