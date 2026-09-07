/**
 * Public class-schedule API helper.
 *
 * Live public endpoint (no admin login):
 *   GET /api/classes.php?public=true  →  { success: true, data: [...] }
 *
 * Do not use /api/classes (404 on Hostinger) or
 * /api/clients.php?listType=classes (admin-only, 401).
 *
 * Local python http.server cannot run PHP, so same-origin /api fails.
 * CORS on the live API is "*", so we fall back to the production origin.
 */
(function (global) {
    const LIVE_API_BASE = 'https://www.frontlinecpr911.com/api';
    const SAME_ORIGIN_API_BASE = '/api';
    const PUBLIC_CLASSES_PATH = '/classes.php?public=true';

    function isJsonResponse(res) {
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        return ct.includes('application/json');
    }

    async function fetchJson(url) {
        const res = await fetch(url, {
            headers: { Accept: 'application/json' },
            cache: 'no-store'
        });
        if (!res.ok) {
            throw new Error('HTTP ' + res.status + ' for ' + url);
        }
        if (!isJsonResponse(res)) {
            throw new Error('Non-JSON response from ' + url);
        }
        return res.json();
    }

    function candidateBases() {
        const bases = [SAME_ORIGIN_API_BASE];
        // Always allow a live fallback when same-origin PHP is unavailable
        // (local preview, file://, or a static-only host).
        if (bases.indexOf(LIVE_API_BASE) === -1) {
            bases.push(LIVE_API_BASE);
        }
        return bases;
    }

    async function fetchPublicClasses() {
        const bases = candidateBases();
        let lastError;
        for (let i = 0; i < bases.length; i++) {
            const url = bases[i] + PUBLIC_CLASSES_PATH;
            try {
                const result = await fetchJson(url);
                if (result && result.success === true && Array.isArray(result.data)) {
                    return result.data;
                }
                lastError = new Error('Unexpected payload from ' + url);
            } catch (err) {
                lastError = err;
            }
        }
        throw lastError || new Error('Unable to load class schedule');
    }

    global.FrontlinePublicApi = {
        LIVE_API_BASE: LIVE_API_BASE,
        PUBLIC_CLASSES_PATH: PUBLIC_CLASSES_PATH,
        fetchPublicClasses: fetchPublicClasses
    };
})(window);
