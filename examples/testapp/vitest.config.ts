import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./setupTests.ts'],
		poolOptions: {
			// Node 25+ ships its own global localStorage, which shadows jsdom's
			forks: { execArgv: ['--no-experimental-webstorage'] },
		},
	},
})
