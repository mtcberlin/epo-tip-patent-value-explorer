import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		experimental: {
			async: true
		}
	},
	kit: {
		adapter: adapter(),
		paths: {
			relative: true
		},
		experimental: {
			remoteFunctions: true
		}
	}
};

export default config;
