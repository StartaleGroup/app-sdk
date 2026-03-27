import { defineConfig, devices } from '@playwright/test'
import { config as loadEnv } from 'dotenv'

import { BASE_URL } from './lib/constants.js'

loadEnv()

// Shared launch options for projects that need Google bot detection bypass.
// Prevents Chrome from setting navigator.webdriver=true.
const antiDetectionLaunchOptions = {
	args: ['--disable-blink-features=AutomationControlled'],
}

export default defineConfig({
	testDir: '.',
	fullyParallel: false,
	workers: 1,
	retries: 2,
	reporter: process.env.CI
		? [
				['list'],
				['json', { outputFile: 'test-results/results.json' }],
				['html', { open: 'never' }],
			]
		: 'list',

	use: {
		baseURL: BASE_URL,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
		// High timeouts for SDK popup auth flows.
		// Eliminates need for inline timeouts in most cases.
		navigationTimeout: 90_000,
		actionTimeout: 60_000,
	},

	timeout: 5 * 60 * 1000,
	expect: { timeout: 60_000 },

	projects: [
		{
			name: 'smoke',
			testMatch: /smoke\/.*\.spec\.ts/,
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'eoa-chromium',
			testMatch: /eoa\/.*\.spec\.ts/,
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'google-chromium',
			testMatch: /google\/.*\.spec\.ts/,
			use: {
				...devices['Desktop Chrome'],
				launchOptions: antiDetectionLaunchOptions,
			},
		},
		{
			name: 'eoa-required-chromium',
			testMatch: /eoa-required\/.*\.spec\.ts/,
			use: {
				...devices['Desktop Chrome'],
				launchOptions: antiDetectionLaunchOptions,
			},
		},
	],

	webServer: {
		command: 'cd ../examples/testapp && pnpm dev',
		url: BASE_URL,
		reuseExistingServer: true,
		timeout: 300_000,
	},
})
