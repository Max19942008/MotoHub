import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GoogleAuthService } from './google-auth.service';
import { AuthTokens } from '../../libs/dto/member/member';

@Resolver()
export class GoogleAuthResolver {
	constructor(private readonly googleAuthService: GoogleAuthService) {}

	/** The frontend's half of the handoff: one-time code in, our own token pair out. */
	@Mutation(() => AuthTokens)
	public async exchangeLoginCode(@Args('code') code: string, @Args('binding') binding: string): Promise<AuthTokens> {
		console.log('Mutation:exchangeLoginCode');
		return await this.googleAuthService.exchangeLoginCode(code, binding);
	}
}
