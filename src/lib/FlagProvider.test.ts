import { afterEach, expect, test, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import type { ComponentProps } from 'svelte';
import { get } from 'svelte/store';
import { InMemoryStorageProvider, UnleashClient } from 'unleash-proxy-client';
import type { IConfig, IToggle } from 'unleash-proxy-client';
import Provider from './Provider.test.svelte';
import type { ObservedState } from './Probe.test.svelte';

const components: Parameters<typeof unmount>[0][] = [];
const clients: UnleashClient[] = [];

afterEach(async () => {
	for (const component of components.splice(0)) await unmount(component);
	for (const client of clients.splice(0)) client.stop();
	vi.useRealTimers();
	document.body.replaceChildren();
});

function createConfig() {
	const requests: string[] = [];
	const toggle: IToggle = {
		name: 'test',
		enabled: false,
		variant: { name: 'blue', enabled: true },
		impressionData: false
	};
	const config: IConfig = {
		url: 'https://example.com/api/frontend',
		clientKey: 'test',
		appName: 'component-test',
		disableMetrics: true,
		storageProvider: new InMemoryStorageProvider(),
		refreshInterval: 1,
		fetch: async (url: Parameters<typeof fetch>[0]) => {
			requests.push(String(url));
			return new Response(JSON.stringify({ toggles: [toggle] }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}
	};
	return { config, requests, toggle };
}

async function ready(client: UnleashClient) {
	clients.push(client);
	if (!client.isReady()) await new Promise<void>((resolve) => client.once('ready', resolve));
}

function show(props: Omit<ComponentProps<typeof Provider>, 'observe'>) {
	const states: ObservedState[] = [];
	const target = document.createElement('div');
	document.body.append(target);
	const component = mount(Provider, {
		target,
		props: { ...props, observe: (state) => states.push(state) }
	});
	components.push(component);
	flushSync();
	return { component, states, target };
}

test('recognizes a client that was ready before the provider mounted', async () => {
	const { config, toggle } = createConfig();
	const client = new UnleashClient({ ...config, bootstrap: [toggle] });
	await ready(client);

	const { target } = show({ client });

	expect(target.textContent).toBe('false:blue:true:');
});

test('detaches provider status listeners when the provider is removed', async () => {
	const { config } = createConfig();
	const client = new UnleashClient(config);
	clients.push(client);
	const { component, states, target } = show({ client });
	const error = new Error('offline');
	client.emit('error', error);
	flushSync();
	expect(target.textContent).toBe('false:disabled:false:offline');

	await unmount(component);
	components.splice(components.indexOf(component), 1);
	await client.start();
	client.emit('error', new Error('after removal'));
	client.emit('recovered');

	expect(get(states[0].flagsReady)).toBe(false);
	expect(get(states[0].flagsError)).toBe(error);
});

test('detaches flag and variant listeners when a child is removed', async () => {
	const { config, toggle } = createConfig();
	const client = new UnleashClient({ ...config, bootstrap: [toggle] });
	await ready(client);
	const { component, states, target } = show({ client });
	toggle.enabled = true;
	toggle.variant = { name: 'green', enabled: true };
	client.emit('update');
	flushSync();
	expect(target.textContent).toBe('true:green:true:');

	flushSync(() => component.setChildVisible(false));
	toggle.enabled = false;
	toggle.variant = { name: 'red', enabled: true };
	client.emit('ready');
	client.emit('update');
	flushSync(() => component.setChildVisible(true));

	expect(get(states[0].flag)).toBe(true);
	expect(get(states[0].variant)?.name).toBe('green');
	expect(target.textContent).toBe('false:red:true:');
});

test('waits for manual startup when a configured client is deferred', async () => {
	vi.useFakeTimers();
	const { config, requests, toggle } = createConfig();
	toggle.enabled = true;
	const { states, target } = show({ config, startClient: false });
	const client = states[0].client!;
	clients.push(client);
	await vi.advanceTimersByTimeAsync(2000);
	expect(requests).toEqual([]);

	await client.start();
	flushSync();

	expect(target.textContent).toBe('true:blue:true:');
});

test('stops polling a provider-owned client when the provider is removed', async () => {
	vi.useFakeTimers();
	const { config, requests } = createConfig();
	const { component, states } = show({ config, startClient: true });
	clients.push(states[0].client!);
	await vi.advanceTimersByTimeAsync(1000);
	expect(requests.length).toBeGreaterThan(0);

	await unmount(component);
	components.splice(components.indexOf(component), 1);
	const count = requests.length;
	await vi.advanceTimersByTimeAsync(3000);

	expect(requests).toHaveLength(count);
});

test('preserves an externally managed client after the provider is removed', async () => {
	vi.useFakeTimers();
	const { config, requests } = createConfig();
	const client = new UnleashClient(config);
	clients.push(client);
	await client.start();
	const { component } = show({ client, stopClient: false });

	await unmount(component);
	components.splice(components.indexOf(component), 1);
	const count = requests.length;
	await vi.advanceTimersByTimeAsync(1000);

	expect(requests).toHaveLength(count + 1);
});

test('finishes cleanup if a provider-owned client starts after removal', async () => {
	vi.useFakeTimers();
	const { config, requests } = createConfig();
	let respond!: (response: Response) => void;
	config.fetch = async (url: Parameters<typeof fetch>[0]) => {
		requests.push(String(url));
		return new Promise<Response>((resolve) => {
			respond = resolve;
		});
	};
	const { component, states } = show({ config, startClient: true });
	clients.push(states[0].client!);
	await vi.advanceTimersByTimeAsync(0);
	expect(requests).toHaveLength(1);

	await unmount(component);
	components.splice(components.indexOf(component), 1);
	respond(new Response(JSON.stringify({ toggles: [] }), { status: 200 }));
	await vi.advanceTimersByTimeAsync(3000);

	expect(requests).toHaveLength(1);
});

test('exposes errors from a client that failed before mounting', async () => {
	const { config } = createConfig();
	const error = new Error('offline before mounting');
	config.fetch = async () => {
		throw error;
	};
	const client = new UnleashClient(config);
	clients.push(client);
	await client.start();

	const { states, target } = show({ client });

	expect(get(states[0].flagsError)).toBe(error);
	expect(target.textContent).toBe('false:disabled:false:offline before mounting');
});

test('exposes bootstrap readiness before asynchronous initialization finishes', () => {
	const { config, toggle } = createConfig();
	const { states, target } = show({ config: { ...config, bootstrap: [toggle] } });
	clients.push(states[0].client!);

	expect(target.textContent).toBe('false:blue:true:');
});

test('does not treat bootstrap as ready when bootstrapOverride is false', () => {
	const { config, toggle } = createConfig();
	const { states } = show({ config: { ...config, bootstrap: [toggle], bootstrapOverride: false } });
	clients.push(states[0].client!);

	expect(get(states[0].flagsReady)).toBe(false);
});

test('clears an existing error when fetching recovers', async () => {
	const { config } = createConfig();
	const successfulFetch = config.fetch!;
	let offline = true;
	config.fetch = async (...args: Parameters<typeof successfulFetch>) => {
		if (offline) throw new Error('offline');
		return successfulFetch(...args);
	};
	const client = new UnleashClient(config);
	clients.push(client);
	await client.start();
	client.stop();
	const { states } = show({ client });
	expect(get(states[0].flagsError)).toBeInstanceOf(Error);

	offline = false;
	await client.start();
	expect(get(states[0].flagsError)).toBe(null);
});

test('stops a manually started client on removal by default', async () => {
	vi.useFakeTimers();
	const { config, requests } = createConfig();
	const { component, states } = show({ config });
	const client = states[0].client!;
	clients.push(client);
	await client.start();
	await unmount(component);
	components.splice(components.indexOf(component), 1);
	const count = requests.length;
	await vi.advanceTimersByTimeAsync(3000);

	expect(requests).toHaveLength(count);
});

test('restarts an already-running supplied client without duplicating polling', async () => {
	vi.useFakeTimers();
	const { config, requests } = createConfig();
	const client = new UnleashClient(config);
	clients.push(client);
	await client.start();
	const { component } = show({ client, startClient: true });
	await vi.advanceTimersByTimeAsync(0);
	const count = requests.length;
	await vi.advanceTimersByTimeAsync(1000);
	expect(requests).toHaveLength(count + 1);

	await unmount(component);
	components.splice(components.indexOf(component), 1);
	const stoppedCount = requests.length;
	await vi.advanceTimersByTimeAsync(2000);
	expect(requests).toHaveLength(stoppedCount);
});
