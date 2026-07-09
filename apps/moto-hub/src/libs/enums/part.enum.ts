import { registerEnumType } from '@nestjs/graphql';

/** Spare part vs. accessory split */
export enum PartCategory {
	SPARE_PART = 'SPARE_PART',
	ACCESSORY = 'ACCESSORY',
}
registerEnumType(PartCategory, {
	name: 'PartCategory',
});

/** Finer sub-category that spans both spare parts and accessories */
export enum PartType {
	// --- SPARE PARTS ---
	ENGINE = 'ENGINE',
	EXHAUST = 'EXHAUST',
	BRAKE = 'BRAKE',
	SUSPENSION = 'SUSPENSION',
	TIRE = 'TIRE',
	BATTERY = 'BATTERY',
	FILTER = 'FILTER',
	CHAIN = 'CHAIN',
	ELECTRICAL = 'ELECTRICAL',
	BODY_PANEL = 'BODY_PANEL',
	// --- ACCESSORIES ---
	HELMET = 'HELMET',
	GLOVES = 'GLOVES',
	JACKET = 'JACKET',
	BOOTS = 'BOOTS',
	LUGGAGE = 'LUGGAGE',
	PHONE_MOUNT = 'PHONE_MOUNT',
	COVER = 'COVER',
	// --- FALLBACK ---
	OTHER = 'OTHER',
}
registerEnumType(PartType, {
	name: 'PartType',
});

export enum PartCondition {
	NEW = 'NEW',
	USED = 'USED',
	REFURBISHED = 'REFURBISHED',
}
registerEnumType(PartCondition, {
	name: 'PartCondition',
});

/** Compatible motorbike brand / part manufacturer */
export enum PartBrand {
	SUZUKI = 'SUZUKI',
	HONDA = 'HONDA',
	YAMAHA = 'YAMAHA',
	KAWASAKI = 'KAWASAKI',
	DUCATI = 'DUCATI',
	BMW = 'BMW',
	HARLEY_DAVIDSON = 'HARLEY_DAVIDSON',
	UNIVERSAL = 'UNIVERSAL',
	OTHER = 'OTHER',
}
registerEnumType(PartBrand, {
	name: 'PartBrand',
});

export enum PartStatus {
	HOLD = 'HOLD',
	ACTIVE = 'ACTIVE',
	SOLD = 'SOLD',
	DELETE = 'DELETE',
}
registerEnumType(PartStatus, {
	name: 'PartStatus',
});

export enum PartLocation {
	TASHKENT = 'TASHKENT',
	ANDIJAN = 'ANDIJAN',
	BUKHARA = 'BUKHARA',
	FERGANA = 'FERGANA',
	JIZZAKH = 'JIZZAKH',
	KHOREZM = 'KHOREZM',
	NAMANGAN = 'NAMANGAN',
	NAVOI = 'NAVOI',
	KASHKADARYA = 'KASHKADARYA',
	SAMARKAND = 'SAMARKAND',
	SIRDARYA = 'SIRDARYA',
	SURKHANDARYA = 'SURKHANDARYA',
	KARAKALPAKSTAN = 'KARAKALPAKSTAN',
}
registerEnumType(PartLocation, {
	name: 'PartLocation',
});
