import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { DOMParser, DOMImplementation, XMLSerializer } from '@xmldom/xmldom';

// Polyfill DOM APIs for Cloudflare Workers
if (typeof globalThis.DOMParser === 'undefined') {
	globalThis.DOMParser = DOMParser as any;
}
if (typeof globalThis.DOMImplementation === 'undefined') {
	globalThis.DOMImplementation = DOMImplementation as any;
}
if (typeof globalThis.XMLSerializer === 'undefined') {
	globalThis.XMLSerializer = XMLSerializer as any;
}
// Add Node constants that AWS SDK needs
if (typeof globalThis.Node === 'undefined') {
	globalThis.Node = {
		ELEMENT_NODE: 1,
		ATTRIBUTE_NODE: 2,
		TEXT_NODE: 3,
		CDATA_SECTION_NODE: 4,
		ENTITY_REFERENCE_NODE: 5,
		ENTITY_NODE: 6,
		PROCESSING_INSTRUCTION_NODE: 7,
		COMMENT_NODE: 8,
		DOCUMENT_NODE: 9,
		DOCUMENT_TYPE_NODE: 10,
		DOCUMENT_FRAGMENT_NODE: 11,
		NOTATION_NODE: 12
	} as any;
}

export interface Env {
	ACCESS_KEY_ID: string;
	SECRET_ACCESS_KEY: string;
	ACCOUNT_ID: string;
	BUCKET: string;
	REGION: string;
}
interface HourPrefixOptions {
	/** 获取多少小时的数据，默认 12 */
	hours?: number;
	/** 排除最近的多少小时（0 = 包含当前小时，1 = 排除当前小时，2 = 排除最近 2 小时）*/
	excludeRecentHours?: number;
}

/**
 * 获取过去 N 小时的时间前缀
 * @example
 * // 过去 12 小时（包含当前）
 * getPastHourPrefixes({ hours: 12 })
 *
 * // 过去 12 小时（排除当前小时）
 * getPastHourPrefixes({ hours: 12, excludeRecentHours: 1 })
 *
 * // 过去 24 小时（排除最近 3 小时）
 * getPastHourPrefixes({ hours: 24, excludeRecentHours: 3 })
 */
export function getPastHourPrefixes(options: HourPrefixOptions = {}): string[] {
	const { hours = 12, excludeRecentHours = 0 } = options;

	const prefixes: string[] = [];
	const now = new Date();

	// 起始偏移：从多少小时前开始
	const startOffset = hours + excludeRecentHours - 1;
	// 结束偏移：到多少小时前结束
	const endOffset = excludeRecentHours;

	for (let i = startOffset; i >= endOffset; i--) {
		const time = new Date(now.getTime() - i * 60 * 60 * 1000);
		// toISOString() 返回的就是 UTC 时间
		// 例如："2025-10-25T15:30:00.000Z"
		const prefix = time.toISOString().slice(0, 13);
		prefixes.push(prefix);
	}

	return prefixes;
}

export const deleteObjects = async (env: Env) => {
	const S3 = new S3Client({
		region: 'auto',
		endpoint: `https://${env.ACCOUNT_ID}.${env.REGION}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: env.ACCESS_KEY_ID,
			secretAccessKey: env.SECRET_ACCESS_KEY
		}
	});
	const prefixs = getPastHourPrefixes({ hours: 6, excludeRecentHours: 2 });

	console.log({ prefixs });
	const keys: { Key: string }[] = [];
	for (let i = 0; i < prefixs.length; i++) {
		const list = await S3.send(
			new ListObjectsV2Command({ Bucket: env.BUCKET, Prefix: prefixs[i] })
		);
		if (list?.Contents?.length ?? 0) {
			for (let j = 0; j < list?.Contents!.length; j++) {
				keys.push({
					Key: list.Contents![j].Key as string
				});
			}
		}
	}

	console.log('keys length=>', keys.length);

	if (keys.length > 0) {
		const deleteCommand = new DeleteObjectsCommand({
			Bucket: env.BUCKET,
			Delete: {
				Objects: keys.slice(0, 1000)
			}
		});
		await S3.send(deleteCommand);
	}
};
