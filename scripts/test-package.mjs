import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const temporary = await mkdtemp(join(tmpdir(), 'svelte-sdk-package-'));
const tools = ['@sveltejs/vite-plugin-svelte', '@types/node', 'svelte-check', 'typescript', 'vite'];

const installedVersion = async (name) =>
	JSON.parse(await readFile(join(root, 'node_modules', name, 'package.json'), 'utf8')).version;
const run = (args, cwd) =>
	execFileSync('pnpm', args, {
		cwd,
		stdio: 'inherit',
		shell: process.platform === 'win32'
	});

try {
	const [pack] = JSON.parse(
		execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', temporary], {
			cwd: root,
			encoding: 'utf8',
			shell: process.platform === 'win32'
		})
	);
	assert(
		pack.files.every(
			({ path }) =>
				!path.startsWith('tests/') && !path.startsWith('scripts/') && !/\.(test|spec)\./.test(path)
		),
		'Test fixtures must not be published'
	);
	const devDependencies = Object.fromEntries(
		await Promise.all(tools.map(async (name) => [name, await installedVersion(name)]))
	);
	const versions = new Set([
		manifest.peerDependencies.svelte.replace(/^\^/, ''),
		await installedVersion('svelte')
	]);

	for (const svelte of versions) {
		console.log(`Checking packed SDK with Svelte ${svelte}`);
		const consumer = join(temporary, svelte);
		await cp(join(root, 'tests/package'), consumer, { recursive: true });
		await cp(join(root, 'pnpm-workspace.yaml'), join(consumer, 'pnpm-workspace.yaml'));
		await cp(join(root, 'pnpm-lock.yaml'), join(consumer, 'pnpm-lock.yaml'));
		await writeFile(
			join(consumer, 'package.json'),
			JSON.stringify({
				name: 'sdk-package-consumer',
				private: true,
				type: 'module',
				packageManager: manifest.packageManager,
				dependencies: { [manifest.name]: `file:${join(temporary, pack.filename)}`, svelte },
				devDependencies,
				scripts: {
					check: 'svelte-check --tsconfig ./tsconfig.json',
					build: 'vite build',
					ssr: 'vite build --ssr ssr.ts --outDir dist/server && node dist/server/ssr.js'
				}
			})
		);
		run(['install', '--lockfile-only'], consumer);
		run(['install', '--frozen-lockfile'], consumer);
		for (const script of ['check', 'build', 'ssr']) run(['run', script], consumer);
	}
} finally {
	await rm(temporary, { recursive: true, force: true });
}
