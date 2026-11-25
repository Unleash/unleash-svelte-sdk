<script module lang="ts">
	import type useFlagType from './useFlag.js';
	import type useVariantType from './useVariant.js';
	import type useFlagsStatusType from './useFlagsStatus.js';
	import type { UnleashClient } from 'unleash-proxy-client';

	export type ObservedState = ReturnType<typeof useFlagsStatusType> & {
		flag: ReturnType<typeof useFlagType>;
		variant: ReturnType<typeof useVariantType>;
		client: UnleashClient | undefined;
	};
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import useFlag from './useFlag.js';
	import useVariant from './useVariant.js';
	import useFlagsStatus from './useFlagsStatus.js';
	import useUnleashClient from './useUnleashClient.js';

	let { observe }: { observe: (state: ObservedState) => void } = $props();
	const flag = useFlag('test');
	const variant = useVariant('test');
	const { flagsReady, flagsError } = useFlagsStatus();
	const client = useUnleashClient();
	untrack(() => observe({ flag, variant, flagsReady, flagsError, client }));
</script>

<p>
	{$flag}:{$variant?.name}:{$flagsReady}:{$flagsError instanceof Error ? $flagsError.message : ''}
</p>
