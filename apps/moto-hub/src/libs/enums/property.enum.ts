import { registerEnumType } from '@nestjs/graphql';

export enum PropertyType {
	SCOOTER  = 'SCOOTER',
	SPORT  = 'SPORT',
	CRUISER  = 'CRUISER',
}
registerEnumType(PropertyType, {
	name: 'PropertyType',
});

export enum PropertyCondition {
	NEW = 'NEW',
	USED = 'USED',
}

registerEnumType(PropertyCondition, {
	name: 'PropertyCondition',
});


export enum PropertyBrand {
  SUZUKI = 'SUZUKI',
  HONDA = 'HONDA',
  YAMAHA = 'YAMAHA',
  KAWASAKI = 'KAWASAKI',
  DUCATI = 'DUCATI',
  BMW = 'BMW',
  HARLEY_DAVIDSON = 'HARLEY_DAVIDSON',
}

registerEnumType(PropertyBrand, {
  name: 'PropertyBrand',
});


export enum PropertyStatus {
	HOLD = 'HOLD',
	ACTIVE = 'ACTIVE',
	SOLD = 'SOLD',
	DELETE = 'DELETE',
}
registerEnumType(PropertyStatus, {
	name: 'PropertyStatus',
});

export enum PropertyLocation {
	SEOUL = 'SEOUL',
	BUSAN = 'BUSAN',
	INCHEON = 'INCHEON',
	DAEGU = 'DAEGU',
	GYEONGJU = 'GYEONGJU',
	GWANGJU = 'GWANGJU',
	CHONJU = 'CHONJU',
	DAEJON = 'DAEJON',
	JEJU = 'JEJU',
}
registerEnumType(PropertyLocation, {
	name: 'PropertyLocation',
});
