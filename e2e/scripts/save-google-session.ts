/**
 * Save Google OAuth session for CI E2E tests.
 *
 * This script opens a browser, navigates to the testapp, triggers
 * the SDK popup, and waits for you to manually log in with Google.
 * After login completes (popup closes), it saves the browser's
 * storageState (cookies + localStorage) to google-session.json.
 *
 * The saved session contains Google's authentication cookies
 * (SID, HSID, etc.) which prevent the "Verify it's you" challenge
 * when running tests from CI's different IP addresses.
 *
 * Prerequisites:
 *   - testapp running at http://localhost:3001 (cd examples/testapp && pnpm dev)
 *
 * Usage:
 *   pnpm save:google-session
 */
import { chromium } from '@playwright/test'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { BASE_URL, ROUTES } from '../lib/constants.js'
import { injectSCWUrl, waitForPopup } from '../lib/helpers.js'
import { dashboardPage } from '../page-objects/dashboardPage.js'
import { rpcMethodCard } from '../page-objects/rpcMethodCard.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = resolve(__dirname, '..', 'google-session.json')

const saveGoogleSession = async () => {
	console.log('Launching browser...')

	const browser = await chromium.launch({
		headless: false,
		args: ['--disable-blink-features=AutomationControlled'],
	})
	const context = await browser.newContext({ baseURL: BASE_URL })
	const page = await context.newPage()

	await injectSCWUrl(page)
	await page.goto(ROUTES.dashboard)

	const dashboard = dashboardPage(page)
	await dashboard.verifyLoaded()

	console.log('Opening SDK popup...')
	const ethRequestAccounts = rpcMethodCard(page, 'eth_requestAccounts')
	const sdkPopup = await waitForPopup(page, () =>
		ethRequestAccounts.submit(),
	)

	console.log('')
	console.log('=== Manual Login Required ===')
	console.log('1. Log in with Google in the popup window')
	console.log('2. Complete any verification (2FA, "Verify it\'s you", etc.)')
	console.log('3. Click "Approve" on the connect-wallet screen')
	console.log('The script will save the session automatically when the popup closes.')
	console.log('')

	// 5 minutes to allow manual login + 2FA + verification
	await sdkPopup.waitForEvent('close', { timeout: 5 * 60 * 1000 })

	console.log('Login complete. Saving session...')
	await context.storageState({ path: OUTPUT_PATH })

	await browser.close()

	console.log(`Session saved to: ${OUTPUT_PATH}`)
	console.log('')
	console.log('Next steps:')
	console.log('  1. Test locally:')
	console.log('     GOOGLE_SESSION_STATE=$(cat e2e/google-session.json) pnpm test:google')
	console.log('  2. For CI, copy the JSON content to GitHub Secret GOOGLE_SESSION_STATE')
}

saveGoogleSession().catch((error) => {
	console.error('Failed to save session:', error)
	process.exit(1)
})
