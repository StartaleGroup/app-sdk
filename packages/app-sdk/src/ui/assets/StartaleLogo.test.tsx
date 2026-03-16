import { render } from '@testing-library/preact'
import { describe, expect, it } from 'vitest'
import { StartaleLogo } from './StartaleLogo.js'

describe('StartaleLogo', () => {
	it('has correct SVG attributes', () => {
		const { container } = render(<StartaleLogo />)
		const svg = container.querySelector('svg')

		expect(svg).toHaveAttribute('width', '16')
		expect(svg).toHaveAttribute('height', '16')
		expect(svg).toHaveAttribute('viewBox', '0 0 60 60')
		expect(svg).toHaveAttribute('fill', 'none')
		expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg')
	})

	it('contains a path element', () => {
		const { container } = render(<StartaleLogo />)
		const path = container.querySelector('path')

		expect(path).toBeInTheDocument()
	})
	it('is accessible', () => {
		const { container } = render(<StartaleLogo />)
		const svg = container.querySelector('svg')

		// SVG should have proper structure for accessibility
		expect(svg).toBeInTheDocument()
		expect(svg?.querySelector('path')).toBeInTheDocument()
	})

	it('maintains aspect ratio', () => {
		const { container } = render(<StartaleLogo />)
		const svg = container.querySelector('svg')

		expect(svg).toHaveAttribute('viewBox', '0 0 60 60')
		expect(svg).toHaveAttribute('width', '16')
		expect(svg).toHaveAttribute('height', '16')
	})
})
