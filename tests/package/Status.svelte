<svelte:options runes={true} />

<script lang="ts">
	import {
		useFlag,
		useVariant,
		useFlagsStatus,
		useUnleashClient,
		useUnleashContext
	} from '@unleash/proxy-client-svelte';

	const enabled = useFlag('example');
	const variant = useVariant('example');
	const { flagsReady, flagsError } = useFlagsStatus();
	const client = useUnleashClient();
	const updateContext = useUnleashContext();
</script>

<p>
	{$enabled}:{$variant?.name}:{$flagsReady}:{Boolean($flagsError)}:{Boolean(
		client
	)}:{typeof updateContext}
</p>
