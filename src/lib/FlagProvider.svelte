<script lang="ts">
	import { setContext, onMount, onDestroy } from 'svelte';
	import { ContextStateSymbol, type TContext } from './context.js';
	import { UnleashClient } from 'unleash-proxy-client';
	import type { IConfig, IMutableContext } from 'unleash-proxy-client';
	import { writable } from 'svelte/store';

	export let config: IConfig | undefined = undefined;
	export let unleashClient: UnleashClient | undefined = undefined;
	export let startClient = true;
	export let stopClient = true;

	const currentClient = unleashClient ?? (config ? new UnleashClient(config) : undefined);
	const client = writable(currentClient);
	const flagsReady = writable(
		Boolean(
			currentClient?.isReady() ||
			(!unleashClient && config?.bootstrap?.length && config.bootstrapOverride !== false)
		)
	);
	const flagsError = writable<unknown>(currentClient?.getError() ?? null);

	if (!currentClient) {
		console.warn('You must provide either a config or an Unleash client to FlagProvider.');
	}

	const onReady = () => flagsReady.set(true);
	const onError = (error: unknown) => flagsError.set(error);
	const onRecovered = () => flagsError.set(null);

	currentClient?.on('ready', onReady);
	currentClient?.on('error', onError);
	currentClient?.on('recovered', onRecovered);

	onDestroy(() => {
		currentClient?.off('ready', onReady);
		currentClient?.off('error', onError);
		currentClient?.off('recovered', onRecovered);
	});

	onMount(() => {
		if (startClient) void currentClient?.start();
		return () => {
			if (stopClient) currentClient?.stop();
		};
	});

	const updateContext = async (context: IMutableContext): Promise<void> => {
		await currentClient?.updateContext(context);
	};
	const isEnabled = (name: string) => currentClient?.isEnabled(name);
	const getVariant = (name: string) => currentClient?.getVariant(name);
	const on = (...args: Parameters<UnleashClient['on']>) => currentClient?.on(...args);

	setContext<TContext>(ContextStateSymbol, {
		on,
		updateContext,
		isEnabled,
		getVariant,
		client,
		flagsReady,
		flagsError
	});
</script>

<slot />
