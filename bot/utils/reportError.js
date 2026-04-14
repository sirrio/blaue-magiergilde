const { resolveApiBaseUrl } = require('../appUrls');
const { withInsecureDispatcher } = require('../httpClient');

const REPORT_TIMEOUT_MS = 5000;

/**
 * Report an error from the bot to the Laravel monitoring endpoint,
 * which feeds it into the report() → Nightwatch pipeline.
 *
 * Fire-and-forget: never throws. Silently swallows any fetch failures
 * so error reporting never crashes the bot.
 *
 * @param {Error|unknown} error
 * @param {'uncaught_exception'|'unhandled_rejection'|'discord_client_error'|'interaction_error'|'message_error'|'operation_error'} source
 * @param {Record<string, unknown>} [context]
 * @returns {Promise<void>}
 */
async function reportBotError(error, source, context = {}) {
    const baseUrl = resolveApiBaseUrl();
    const token = process.env.BOT_HTTP_TOKEN;

    if (!baseUrl || !token) {
        return;
    }

    const url = `${baseUrl}/monitoring/bot-errors`;

    const payload = {
        source,
        message: (error instanceof Error ? error.message : String(error ?? 'Unknown bot error')) || 'Unknown bot error',
        stack: error instanceof Error ? (error.stack ?? null) : null,
        context: {
            error_name: error instanceof Error ? error.name : null,
            error_code: (error instanceof Error && 'code' in error) ? String(error.code) : null,
            ...context,
        },
    };

    try {
        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(REPORT_TIMEOUT_MS),
            ...withInsecureDispatcher(url),
        });
    } catch {
        // intentionally swallowed — reporting must never destabilise the bot
    }
}

module.exports = { reportBotError };
