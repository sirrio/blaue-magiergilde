function getGamesScanSinceDate({ referenceDate = new Date(), months = 3 } = {}) {
    const normalizedMonths = Number.isFinite(months) ? Math.min(24, Math.max(1, months)) : 3;
    const since = new Date(referenceDate);
    since.setMonth(since.getMonth() - normalizedMonths);
    return since;
}

module.exports = {
    getGamesScanSinceDate,
};
