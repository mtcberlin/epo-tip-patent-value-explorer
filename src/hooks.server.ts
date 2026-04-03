import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	// Security headers (CSP is handled by SvelteKit's built-in config if needed)
	// For now, use permissive script-src to allow SvelteKit inline scripts
	const csp = [
		"default-src 'self'",
		"connect-src 'self'",
		"script-src 'self' 'unsafe-inline'",
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data:",
		"font-src 'self' data:"
	].join('; ');

	response.headers.set('Content-Security-Policy', csp);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	return response;
};
