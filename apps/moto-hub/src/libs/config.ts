import { ObjectId } from 'bson';

export const availableAgentSorts = ['createdAt', 'updatedAt', 'memberLikes', 'memberViews', 'memberRank'];
export const availableMemberSorts = ['createdAt', 'updatedAt', 'memberLikes', 'memberViews'];
export const availableOptions = ['propertyBarter', 'propertyRent'];
export const availablePropertySorts = [
	'createdAt',
	'updatedAt',
	'propertyLikes',
	'propertyViews',
	'propertyRank',
	'propertyPrice',
];
export const availableBoardArticleSorts = ['createdAt', 'updatedAt', 'articleLikes', 'articleViews'];
export const availableCommentSorts = ['createdAt', 'updatedAt'];
export const availablePartOptions = ['partBarter'];
export const availablePartSorts = [
	'createdAt',
	'updatedAt',
	'partLikes',
	'partViews',
	'partRank',
	'partPrice',
];

/** IMAGE CONFIGURATION  **/
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { T } from './types/common';

export const validMimeTypes = ['image/png', 'image/jpg', 'image/jpeg'];
export const getSerialForImage = (filename: string) => {
	const ext = path.parse(filename).ext;
	return uuidv4() + ext;
};

/**
 * createWriteStream will not create parent folders. When the parts module was
 * added nobody made `uploads/part` on the server, so every part image failed to
 * write — silently, because the uploader logs per-file errors and returns the
 * survivors. Creating the folder on demand means a new target never needs a
 * manual mkdir in production again.
 *
 * `target` is already restricted to [a-zA-Z0-9_-] by the resolver, so it cannot
 * escape the uploads directory.
 */
export const ensureUploadDir = (target: string): string => {
	const dir = path.join('uploads', target);
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	return dir;
};

/**
 * Render's disk is wiped on every restart, so with CLOUDINARY_URL set images go
 * to Cloudinary instead. The public_id mirrors the old relative path
 * (`uploads/<target>/<uuid>`) and we still return `uploads/<target>/<uuid>.<ext>`,
 * so stored values keep their shape and the frontend only swaps its base URL
 * to `https://res.cloudinary.com/<cloud>/image/upload`.
 * Without CLOUDINARY_URL (local dev) files are written to ./uploads as before.
 */
export const saveImage = async (stream: NodeJS.ReadableStream, target: string, filename: string): Promise<string> => {
	const imageName = getSerialForImage(filename);

	if (!process.env.CLOUDINARY_URL) {
		const url = `${ensureUploadDir(target)}/${imageName}`;
		await new Promise<void>((resolve, reject) => {
			stream.pipe(fs.createWriteStream(url)).on('finish', resolve).on('error', reject);
		});
		return url;
	}

	const url = path.posix.join('uploads', target, imageName);
	const publicId = url.slice(0, -path.extname(url).length || undefined);
	await new Promise((resolve, reject) => {
		const upload = cloudinary.uploader.upload_stream(
			{ public_id: publicId, resource_type: 'image', overwrite: false },
			(err, res) => (err ? reject(err) : resolve(res)),
		);
		stream.on('error', reject).pipe(upload);
	});
	return url;
};

export const shapeIntoMongoObjectId = (target: any) => {
	return typeof target === 'string' ? new ObjectId(target) : target;
};

export const lookupAuthMemberLiked = (memberId: T, targetRefId: string = '$_id') => {
	return {
		$lookup: {
			from: 'likes',
			let: {
				localLikeRefId: targetRefId,
				localMemberId: memberId,
				localMyFavorite: true,
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$and: [{ $eq: ['$likeRefId', '$$localLikeRefId'] }, { $eq: ['$memberId', '$$localMemberId'] }],
						},
					},
				},
				{
					$project: {
						_id: 0,
						memberId: 1,
						likeRefId: 1,
						myFavorite: '$$localMyFavorite',
					},
				},
			],
			as: 'meLiked',
		},
	};
};

interface LookupAuthMemberFollowed {
	followerId: T;
	followingId: string;
}

export const lookupAuthMemberFollowed = (input: LookupAuthMemberFollowed) => {
	const { followerId, followingId } = input;
	return {
		$lookup: {
			from: 'follows',
			let: {
				localFollowerId: followerId,
				localFollowingId: followingId,
				localMyFavorite: true,
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$and: [{ $eq: ['$followerId', '$$localFollowerId'] }, { $eq: ['$followingId', '$$localFollowingId'] }],
						},
					},
				},
				{
					$project: {
						_id: 0,
						followerId: 1,
						followingId: 1,
						myFollowing: '$$localMyFavorite',
					},
				},
			],
			as: 'meFollowed',
		},
	};
};

/**
 * Drops blocked members' content out of a list query. Combines with an existing
 * memberId filter instead of overwriting it, so "this agent's listings" and
 * "not from anyone I blocked" can both apply.
 */
export const applyBlockFilter = (match: T, blockedIds: T[]): void => {
	if (!blockedIds?.length) return;
	match.memberId = match.memberId ? { $eq: match.memberId, $nin: blockedIds } : { $nin: blockedIds };
};

export const lookupMember = {
	$lookup: {
		from: 'members',
		localField: 'memberId',
		foreignField: '_id',
		as: 'memberData',
	},
};

export const lookupFollowingData = {
	$lookup: {
		from: 'members',
		localField: 'followingId',
		foreignField: '_id',
		as: 'followingData',
	},
};

export const lookupFollowerData = {
	$lookup: {
		from: 'members',
		localField: 'followerId',
		foreignField: '_id',
		as: 'followerData',
	},
};

export const lookupFavorite = {
	$lookup: {
		from: 'members',
		localField: 'favorityProperty.memberId',
		foreignField: '_id',
		as: 'favorityProperty.memberData',
	},
};

export const lookupVisit = {
	$lookup: {
		from: 'members',
		localField: 'visitedProperty.memberId',
		foreignField: '_id',
		as: 'visitedProperty.memberData',
	},
};

export const lookupFavoritePart = {
	$lookup: {
		from: 'members',
		localField: 'favoritePart.memberId',
		foreignField: '_id',
		as: 'favoritePart.memberData',
	},
};

export const lookupVisitPart = {
	$lookup: {
		from: 'members',
		localField: 'visitedPart.memberId',
		foreignField: '_id',
		as: 'visitedPart.memberData',
	},
};