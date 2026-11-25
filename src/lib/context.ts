import type { Writable } from 'svelte/store';
import type { IMutableContext, IVariant, UnleashClient } from 'unleash-proxy-client';

export const ContextStateSymbol = Symbol('Context state identifier');

export type TContext = {
	on: (...args: Parameters<UnleashClient['on']>) => void;
	updateContext: (context: IMutableContext) => Promise<void>;
	isEnabled: (name: string) => boolean | undefined;
	getVariant: (name: string) => IVariant | undefined;
	client: Writable<UnleashClient | undefined>;
	flagsReady: Writable<boolean>;
	flagsError: Writable<unknown>;
};
