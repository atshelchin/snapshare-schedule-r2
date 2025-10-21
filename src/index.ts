interface Env {
	ACCESS_KEY_ID: string;
	SECRET_ACCESS_KEY: string;
	ACCOUNT_ID: string;
	BUCKET: string;
	REGION: string;
}

import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getPastHourPrefixes } from './lib';

export default {
	async scheduled(controller: ScheduledController, env: Env) {
		console.log('cron processed');
		// console.log({ controller, env, ctx });
		// 删除 R2 存储的文件
		const S3 = new S3Client({
			region: env.REGION,
			endpoint: `https://${env.ACCOUNT_ID}.${env.REGION}.r2.cloudflarestorage.com`,
			credentials: {
				accessKeyId: env.ACCESS_KEY_ID,
				secretAccessKey: env.SECRET_ACCESS_KEY
			}
		});
		const prefixs = getPastHourPrefixes({ hours: 6, excludeRecentHours: 2 });

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
		const deleteCommand = new DeleteObjectsCommand({
			Bucket: env.BUCKET,
			Delete: {
				Objects: keys.slice(0, 1000)
			}
		});
		await S3.send(deleteCommand);
	}
};
