/**
 * Helper for Dynamic's step-up (re-verification) in Super App.
 *
 * Super App asks Dynamic for step-up before linking or unlinking a wallet.
 * When the environment requires it, a LINE-signed-in user re-verifies with
 * LINE: directly when LINE is the only method, or after picking LINE on
 * Dynamic's "Verify your identity" screen when a wallet is linked too.
 */

import type { Page } from '@playwright/test'

import { completeLineLogin } from './line-oauth.js'

const ignoreFailure = <T>(promise: Promise<T>): Promise<T | null> =>
	promise.catch(() => null)

/**
 * Run a step-up gated `action` on a Super App page and complete LINE
 * re-verification if Dynamic asks for it. `settled` waits for the state the
 * action leads to with or without step-up; it runs once more at the end, so
 * a slow re-verification can't use up its timeout.
 */
export const withLineStepUp = async (
	page: Page,
	action: () => Promise<void>,
	settled: () => Promise<unknown>,
): Promise<void> => {
	const context = page.context()
	const existingPages = new Set(context.pages())
	const chooseMethodView = page.getByTestId(
		'step-up-reauth-choose-method-view',
	)

	await action()

	const outcome = await Promise.race([
		ignoreFailure(settled().then(() => 'settled' as const)),
		ignoreFailure(
			chooseMethodView
				.waitFor({ state: 'visible' })
				.then(() => 'choose' as const),
		),
		ignoreFailure(context.waitForEvent('page').then(() => 'line' as const)),
		ignoreFailure(
			page
				.waitForURL((url) => url.hostname.endsWith('line.me'))
				.then(() => 'line' as const),
		),
	])

	if (outcome === 'choose') {
		// The primary option is the sign-in method, LINE for these users.
		await chooseMethodView.getByTestId('step-up-reauth-option-oauth').click()
	}
	if (outcome === 'choose' || outcome === 'line') {
		await completeLineLogin(page, existingPages)
	}

	await settled()
}
