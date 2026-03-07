import { defineConfig, devices } from '@playwright/test'
import { config as loadEnv } from 'dotenv'

loadEnv()

const baseURL = process.env.TESTAPP_URL ?? 'http://localhost:3001'

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
		baseURL,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
		// High timeouts for SDK popup auth flows.
		// Eliminates need for inline timeouts in most cases.
		navigationTimeout: 90_000,
		actionTimeout: 60_000,
	},

	timeout: 15 * 60 * 1000,
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
				launchOptions: {
					// Prevent Chrome from setting navigator.webdriver=true,
					// which Google uses to detect browser automation (bot detection bypass).
					args: ['--disable-blink-features=AutomationControlled'],
				},
			},
		},
	],

	webServer: {
		command: 'cd ../examples/testapp && pnpm dev',
		url: baseURL,
		reuseExistingServer: true,
		timeout: 300_000,
	},
})
