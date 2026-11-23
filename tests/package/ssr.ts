import assert from 'node:assert/strict';
import { render } from 'svelte/server';
import Legacy from './Legacy.svelte';
import Runes from './Runes.svelte';
import { config, type Config } from './config.js';

const parents = [
	(config: Config) => render(Legacy, { props: { config } }),
	(config: Config) => render(Runes, { props: { config } })
];

for (const renderParent of parents) {
	for (const enabled of [true, false, true]) {
		const { body } = renderParent(config(enabled));
		const expected = enabled
			? 'true:blue:true:false:true:function'
			: 'false:disabled:true:false:true:function';
		assert(body.includes(expected), `SSR must keep each render's flags isolated: ${body}`);
	}
}
console.log('SSR passed for legacy and rune-based parents');
