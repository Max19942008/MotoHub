import { Args, Mutation, Resolver, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ObjectId } from 'mongoose';
import { PartService } from './part.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { WithoutGuard } from '../auth/guards/without.guard';
import { AuthGuard } from '../auth/guards/auth.guard';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Part, Parts } from '../../libs/dto/part/part';
import { AgentPartsInquiry, AllPartsInquiry, PartInput, PartsInquiry } from '../../libs/dto/part/part.input';
import { PartUpdate } from '../../libs/dto/part/part.update';
import { OrdinaryInquiry } from '../../libs/dto/property/property.input';

@Resolver()
export class PartResolver {
	constructor(private readonly partService: PartService) {}

	@Roles(MemberType.AGENT)
	@UseGuards(RolesGuard)
	@Mutation(() => Part)
	public async createPart(
		@Args('input') input: PartInput,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Part> {
		console.log('Mutation: createPart');
		input.memberId = memberId;
		return await this.partService.createPart(input);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Part)
	public async getPart(
		@Args('partId') input: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Part> {
		console.log('Query: getPart');
		const partId = shapeIntoMongoObjectId(input);
		return await this.partService.getPart(memberId, partId);
	}

	@Roles(MemberType.AGENT)
	@UseGuards(RolesGuard)
	@Mutation(() => Part)
	public async updatePart(
		@Args('input') input: PartUpdate,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Part> {
		console.log('Mutation: updatePart');
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.partService.updatePart(memberId, input);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Parts)
	public async getParts(
		@Args('input') input: PartsInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Parts> {
		console.log('Query: getParts');
		return await this.partService.getParts(memberId, input);
	}

	@Roles(MemberType.AGENT)
	@UseGuards(RolesGuard)
	@Query(() => Parts)
	public async getAgentParts(
		@Args('input') input: AgentPartsInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Parts> {
		console.log('Query: getAgentParts');
		return await this.partService.getAgentParts(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Query(() => Parts)
	public async getFavoriteParts(
		@Args('input') input: OrdinaryInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Parts> {
		console.log('Query: getFavoriteParts');
		return await this.partService.getFavorites(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Query(() => Parts)
	public async getVisitedParts(
		@Args('input') input: OrdinaryInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Parts> {
		console.log('Query: getVisitedParts');
		return await this.partService.getVisited(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Part)
	public async likeTargetPart(
		@Args('partId') input: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Part> {
		console.log('Mutation: likeTargetPart');
		const likeRefId = shapeIntoMongoObjectId(input);
		return await this.partService.likeTargetPart(memberId, likeRefId);
	}

	/** ADMIN **/

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => Parts)
	public async getAllPartsByAdmin(@Args('input') input: AllPartsInquiry): Promise<Parts> {
		console.log('Query: getAllPartsByAdmin');
		return await this.partService.getAllPartsByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Part)
	public async updatePartByAdmin(@Args('input') input: PartUpdate): Promise<Part> {
		console.log('Mutation: updatePartByAdmin');
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.partService.updatePartByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Part)
	public async removePartByAdmin(@Args('partId') input: string): Promise<Part> {
		console.log('Mutation: removePartByAdmin');
		const partId = shapeIntoMongoObjectId(input);
		return await this.partService.removePartByAdmin(partId);
	}
}
