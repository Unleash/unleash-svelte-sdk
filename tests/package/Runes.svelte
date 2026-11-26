<script lang="ts">
	import { FlagProvider } from '@unleash/proxy-client-svelte';
	import type { Config } from './config.js';
	import Status from './Status.svelte';

	let { config }: { config: Config } = $props();
</script>

<FlagProvider {config}>
	{#snippet children()}
		<Status />
	{/snippet}
</FlagProvider>
