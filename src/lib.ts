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
