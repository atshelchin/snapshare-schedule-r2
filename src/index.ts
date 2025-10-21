import { type Env, deleteObjects } from './lib';

export default {
	async scheduled(controller: ScheduledController, env: Env) {
		console.log('cron processed');
		// 删除 R2 存储的文件
		await deleteObjects(env);
	}
};
