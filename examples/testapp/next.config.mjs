export default {
	// `output: 'export'` is opt-in so the /api/paymaster proxy route works
	// under normal `next dev` / `next build`. Set STATIC_EXPORT=true when you
	// intend to deploy the playground as pure static files — the API route
	// will then be omitted and you'll need an external proxy instead.
	...(process.env.STATIC_EXPORT === 'true' ? { output: 'export' } : {}),
	basePath: process.env.NODE_ENV === 'production' ? '/account-sdk' : undefined,
	pageExtensions: ['page.tsx', 'page.ts', 'page.js', 'page.jsx'],
	eslint: {
		// Ignore eslint for `next lint`.
		// GitHub discussion for supporting biome: https://github.com/vercel/next.js/discussions/59347
		ignoreDuringBuilds: true,
	},
}
