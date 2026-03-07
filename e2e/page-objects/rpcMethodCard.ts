import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Page object for interacting with an RPC method card on the dashboard.
 * All selectors use data-testid for stability.
 *
 * Naming convention: rpc-{element}-{method}[-{detail}]
 *   - rpc-card-{method}           — card container (form)
 *   - rpc-submit-{method}         — Submit button
 *   - rpc-param-{method}-{key}    — param textarea
 *   - rpc-shortcut-{method}-{key} — shortcut button
 *   - rpc-response-{method}       — success response container
 *   - rpc-error-{method}          — error response container
 *
 * When a method appears in multiple sections (e.g. wallet_sendCalls),
 * pass `sectionTestId` to scope selectors to a specific section.
 */
export const rpcMethodCard = (
	page: Page,
	method: string,
	sectionTestId?: string,
) => {
	const scope = sectionTestId
		? page.getByTestId(sectionTestId)
		: page.locator('body')

	const card = scope.getByTestId(`rpc-card-${method}`)

	return {
		card,

		/** Click the Submit button */
		submit: async () => {
			await card.getByTestId(`rpc-submit-${method}`).click()
		},

		/** Open the Params accordion (collapsed by default when shortcuts exist) */
		openParams: async () => {
			await card.getByRole('button', { name: 'Params' }).click()
		},

		/** Click a shortcut button by its key */
		clickShortcut: async (key: string) => {
			await card.getByTestId(`rpc-shortcut-${method}-${key}`).click()
		},

		/** Fill a param textarea by its key */
		fillParam: async (key: string, value: string) => {
			await card.getByTestId(`rpc-param-${method}-${key}`).fill(value)
		},

		/** Get the success response text */
		getResponse: async (): Promise<string> => {
			const container = card.getByTestId(`rpc-response-${method}`)
			await container.waitFor({ state: 'visible' })
			return container.innerText()
		},

		/** Get the error response text */
		getError: async (): Promise<string> => {
			const container = card.getByTestId(`rpc-error-${method}`)
			await container.waitFor({ state: 'visible' })
			return container.innerText()
		},

		/** Wait for any response (success or error) */
		waitForResponse: async () => {
			const response = card.getByTestId(`rpc-response-${method}`)
			const error = card.getByTestId(`rpc-error-${method}`)
			await expect(response.or(error)).toBeVisible()
		},
	}
}
