/**
 * Save LINE OAuth session for CI E2E tests.
 *
 * This script opens a browser, navigates to the testapp, triggers
 * the SDK popup, and waits for you to manually log in with LINE.
 * After login completes (popup closes), it saves the browser's
 * LINE cookies to line-session.json.
 *
 * The saved session contains LINE's authentication cookies
 * (access.line.me domain) which enable SSO login on subsequent
 * runs — the "Continue as [user]" screen appears instead of
 * the email/password form and verification code.
 *
 * Prerequisites:
 *   - testapp running at http://localhost:3001 (cd examples/testapp && pnpm dev)
 *
 * Usage:
 *   pnpm save:line-session
 */
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { BASE_URL, ROUTES } from '../lib/constants.js'
import { isLineDomain, injectSCWUrl, waitForPopup } from '../lib/helpers.js'
import { dashboardPage } from '../page-objects/dashboardPage.js'
import { rpcMethodCard } from '../page-objects/rpcMethodCard.js'

const OUTPUT_PATH = resolve('line-session.json')

const saveLineSession = async (): Promise<void> => {
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
	console.log('1. Click "LINE" on the sign-up page')
	console.log('2. Check the consent checkbox and click "Continue with LINE"')
	console.log('3. Log in with LINE (email, password, verification code)')
	console.log('4. Click "Approve" on the connect-wallet screen')
	console.log('The script will save the session automatically when the popup closes.')
	console.log('')

	// 5 minutes to allow manual login + verification code
	await sdkPopup.waitForEvent('close', { timeout: 5 * 60 * 1000 })

	console.log('Login complete. Saving session...')

	// Save full state for local debugging
	const fullPath = resolve('line-session-full.json')
	await context.storageState({ path: fullPath })

	// Filter to LINE-only cookies for CI (GitHub Secrets has a 48KB limit).
	const state = await context.storageState()
	const lineCookies = state.cookies.filter((c) => isLineDomain(c.domain))
	const filtered = JSON.stringify({ cookies: lineCookies })
	writeFileSync(OUTPUT_PATH, filtered)

	await browser.close()

	console.log(`Full session saved to: ${fullPath}`)
	console.log(`Filtered session (LINE cookies only) saved to: ${OUTPUT_PATH}`)
	console.log(`  Size: ${(filtered.length / 1024).toFixed(1)}KB (GitHub Secrets limit: 48KB)`)
	console.log('')
	console.log('Next steps:')
	console.log('  1. Test locally:')
	console.log('     LINE_SESSION_STATE=$(cat e2e/line-session.json) pnpm test:line')
	console.log('  2. For CI, copy the content of line-session.json to GitHub Secret LINE_SESSION_STATE')
}

saveLineSession().catch((error) => {
	console.error('Failed to save session:', error)
	process.exit(1)
})
