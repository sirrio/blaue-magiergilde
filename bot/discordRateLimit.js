const rateLimitStates = new WeakMap();

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function ensureState(client) {
    if (!client) return null;

    let state = rateLimitStates.get(client);
    if (!state) {
        state = { until: 0, attached: false };
        rateLimitStates.set(client, state);
    }

    return state;
}

function attachRateLimitListener(client) {
    const state = ensureState(client);
    if (!state || state.attached || !client?.rest?.on) {
        return;
    }

    state.attached = true;
    client.rest.on('rateLimited', info => {
        const waitMs = Number(
            info?.timeToReset ??
            info?.timeout ??
            info?.retryAfter ??
            info?.retry_after ??
            info?.resetAfter ??
            0
        );
        if (!Number.isFinite(waitMs) || waitMs <= 0) {
            return;
        }

        const until = Date.now() + waitMs;
        if (until > state.until) {
            state.until = until;
        }
    });
}

async function waitForDiscordRateLimit(client) {
    const state = ensureState(client);
    if (!state) return;

    attachRateLimitListener(client);

    const waitMs = state.until - Date.now();
    if (waitMs > 0) {
        await sleep(waitMs);
    }
}

module.exports = {
    attachRateLimitListener,
    waitForDiscordRateLimit,
};
