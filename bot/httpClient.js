const { Agent } = require('undici');

const insecureAgent = new Agent({
    connect: {
        rejectUnauthorized: false,
    },
});

let insecureTlsEnabled = false;

function shouldAllowInsecure(urlString) {
    try {
        const url = new URL(urlString);
        const host = url.hostname.toLowerCase();
        return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.test');
    } catch {
        return false;
    }
}

function enableInsecureTlsIfNeeded(urlString) {
    if (!shouldAllowInsecure(urlString) || insecureTlsEnabled) {
        return;
    }

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    insecureTlsEnabled = true;
    console.warn('[bot] Local TLS verification disabled for bot HTTP requests.');
}

function withInsecureDispatcher(urlString, options = {}) {
    enableInsecureTlsIfNeeded(urlString);

    return {
        ...options,
        dispatcher: shouldAllowInsecure(urlString) ? insecureAgent : options.dispatcher,
    };
}

module.exports = {
    enableInsecureTlsIfNeeded,
    shouldAllowInsecure,
    withInsecureDispatcher,
};
