interface Env {
	abc: string;
}
export default {
	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
		console.log('cron processed');
		console.log({ controller, env, ctx });
	}
};
