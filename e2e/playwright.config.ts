import { defineConfig, devices } from '@playwright/test'
import { config as loadEnv } from 'dotenv'

import { BASE_URL } from './lib/constants.js'

loadEnv({ quiet: true })

// Shared launch options for projects that need Google bot detection bypass.
// Prevents Chrome from setting navigator.webdriver=true.
const antiDetectionLaunchOptions = {
	args: ['--disable-blink-features=AutomationControlled'],
}

// Traces, videos and screenshots record whatever the browser held at the
// time, so they are treated as sensitive build output. Capture is off in CI
// unless a run explicitly opts in; local runs are unaffected.
const captureArtifacts =
	!process.env.CI || process.env.E2E_CAPTURE_ARTIFACTS === '1'

export default defineConfig({
	testDir: '.',
	fullyParallel: false,
	workers: 1,
	retries: 2,
	// The HTML and JSON reporters record step detail regardless of the
	// trace/video/screenshot settings, so CI runs `list` only. The richer
	// reporters stay on locally, where their output is not published.
	reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],

	use: {
		baseURL: BASE_URL,
		trace: captureArtifacts ? 'on-first-retry' : 'off',
		screenshot: captureArtifacts ? 'only-on-failure' : 'off',
		video: captureArtifacts ? 'retain-on-failure' : 'off',
		// High timeouts for SDK popup auth flows.
		// Eliminates need for inline timeouts in most cases.
		navigationTimeout: 90_000,
		actionTimeout: 90_000,
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
			name: 'line-chromium',
			testMatch: /line\/.*\.spec\.ts/,
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
