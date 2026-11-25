import type { ComponentProps } from 'svelte';
import { FlagProvider } from '@unleash/proxy-client-svelte';

export type Config = NonNullable<ComponentProps<typeof FlagProvider>['config']>;

export function config(enabled: boolean): Config {
	return {
		url: 'https://example.com/api/frontend',
		clientKey: 'test',
		appName: 'package-consumer',
		disableMetrics: true,
		disableRefresh: true,
		bootstrap: [
			{
				name: 'example',
				impressionData: false,
				enabled,
				variant: { name: enabled ? 'blue' : 'disabled', enabled }
			}
		]
	};
}
