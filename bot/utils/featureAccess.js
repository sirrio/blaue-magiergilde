function parseAllowlistedUserIds(value) {
    return String(value || '')
        .split(',')
        .map((entry) => Number.parseInt(String(entry).trim(), 10))
        .filter((entry) => Number.isInteger(entry) && entry > 0);
}

function canUseLevelCurveUpgradeForUserId(userId) {
    const normalizedUserId = Number(userId);
    if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
        return false;
    }

    /** TODO: remove this temporary beta allowlist once level curve upgrades are released for everyone. */
    const allowedUserIds = parseAllowlistedUserIds(process.env.FEATURE_LEVEL_CURVE_UPGRADE_USER_IDS);

    return allowedUserIds.includes(normalizedUserId);
}

module.exports = {
    canUseLevelCurveUpgradeForUserId,
    parseAllowlistedUserIds,
};
