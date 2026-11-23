import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig(({ isSsrBuild }) => ({
	plugins: [svelte()],
	ssr: { noExternal: ['@unleash/proxy-client-svelte'] },
	build: isSsrBuild ? {} : { lib: { entry: ['Legacy.svelte', 'Runes.svelte'], formats: ['es'] } }
}));
