import assert from 'node:assert/strict';
import { render } from 'svelte/server';
import Legacy from './Legacy.svelte';
import Runes from './Runes.svelte';
import { config, type Config } from './config.js';

const parents = [
	(config: Config) => render(Legacy, { props: { config } }),
	(config: Config) => render(Runes, { props: { config } })
];

let fetches = 0;

for (const renderParent of parents) {
	for (const enabled of [true, false, true]) {
		const configuration = config(enabled);
		configuration.fetch = async () => {
			fetches++;
			return new Response(JSON.stringify({ toggles: [] }), { status: 200 });
		};
		const { body } = renderParent(configuration);
		const expected = enabled
			? 'true:blue:true:false:true:function'
			: 'false:disabled:true:false:true:function';
		assert(body.includes(expected), `SSR must keep each render's flags isolated: ${body}`);
	}
}
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(fetches, 0, 'Default provider startup must not fetch during SSR');
console.log('SSR isolation and default startup passed for legacy and rune-based parents');
