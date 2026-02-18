const db = require('./db');

function nowSql() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function normalizeOperationId(value) {
    const parsed = Number(value || 0);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return Math.floor(parsed);
}

async function updateOperationProgress(operationId, progress) {
    const normalizedOperationId = normalizeOperationId(operationId);
    if (!normalizedOperationId) {
        return;
    }

    const payload = JSON.stringify({
        total_lines: Number(progress?.totalLines || 0),
        posted_lines: Number(progress?.postedLines || 0),
        last_line: progress?.lastLine ? String(progress.lastLine).slice(0, 220) : null,
    });

    try {
        const [result] = await db.execute(
            'UPDATE bot_operations SET meta = ?, updated_at = ? WHERE id = ?',
            [payload, nowSql(), normalizedOperationId],
        );
        if (!result || Number(result.affectedRows || 0) < 1) {
            console.warn(`[bot-progress] No operation row updated for operation #${normalizedOperationId}.`);
        }
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        console.warn(`[bot-progress] Failed to update operation #${normalizedOperationId}: ${detail}`);
    }
}

async function resolveOperationId({ operationId, action, channelId = null }) {
    const normalizedOperationId = normalizeOperationId(operationId);
    if (normalizedOperationId) {
        return normalizedOperationId;
    }

    const params = [action];
    let sql = `
        SELECT id
        FROM bot_operations
        WHERE action = ?
          AND status IN ('pending', 'posting_to_discord', 'rotating_pointers')
    `;

    if (channelId) {
        sql += ' AND channel_id = ?';
        params.push(String(channelId));
    }

    sql += ' ORDER BY id DESC LIMIT 1';

    try {
        const [rows] = await db.execute(sql, params);
        const fallbackId = normalizeOperationId(rows?.[0]?.id);
        if (fallbackId) {
            console.warn(`[bot-progress] Falling back to open operation #${fallbackId} for action ${action}.`);
            return fallbackId;
        }
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        console.warn(`[bot-progress] Failed to resolve fallback operation for action ${action}: ${detail}`);
    }

    return null;
}

module.exports = {
    resolveOperationId,
    updateOperationProgress,
};

