import { registerEnumType } from '@nestjs/graphql';

/**
 * Currency a price was entered in. Stored alongside the raw amount rather than
 * converted, so a seller always sees back exactly the number they typed.
 */
export enum Currency {
	USD = 'USD',
	KRW = 'KRW',
	UZS = 'UZS',
}
registerEnumType(Currency, {
	name: 'Currency',
});
