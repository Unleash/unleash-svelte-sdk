<script lang="ts">
	import FlagProvider from '@unleash/proxy-client-svelte';
	import type { Config } from './config.js';
	import Status from './Status.svelte';

	export let config: Config;
</script>

<FlagProvider {config}>
	<Status />
</FlagProvider>
