<script lang="ts">
	import type { IConfig, UnleashClient } from 'unleash-proxy-client';
	import FlagProvider from './FlagProvider.svelte';
	import Probe, { type ObservedState } from './Probe.test.svelte';

	let {
		config,
		client,
		startClient = false,
		stopClient = true,
		observe
	}: {
		config?: IConfig;
		client?: UnleashClient;
		startClient?: boolean;
		stopClient?: boolean;
		observe: (state: ObservedState) => void;
	} = $props();
	let visible = $state(true);

	export function setChildVisible(value: boolean) {
		visible = value;
	}
</script>

<FlagProvider {config} unleashClient={client} {startClient} {stopClient}>
	{#if visible}
		<Probe {observe} />
	{/if}
</FlagProvider>
