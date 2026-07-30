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

/**
 * How each currency is written. Dollar and won lead with the symbol; so'm
 * follows the amount, which is how prices are written in Uzbekistan.
 * Kept in step with the same table on the clients.
 */
export const CURRENCY_META: Record<Currency, { symbol: string; suffix: boolean }> = {
	[Currency.USD]: { symbol: '$', suffix: false },
	[Currency.KRW]: { symbol: '₩', suffix: false },
	[Currency.UZS]: { symbol: "so'm", suffix: true },
};

/** Renders a price in the currency the seller chose. Pre-currency listings are USD. */
export const formatPrice = (value?: number | null, currency?: Currency | string | null): string => {
	if (value === undefined || value === null) return '-';
	const amount = value.toLocaleString('en-US');
	const meta = CURRENCY_META[currency as Currency] ?? CURRENCY_META[Currency.USD];
	return meta.suffix ? `${amount} ${meta.symbol}` : `${meta.symbol}${amount}`;
};
