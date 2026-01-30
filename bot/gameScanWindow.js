function getGamesScanSinceDate({ referenceDate = new Date(), years = 10 } = {}) {
    const normalizedYears = Number.isFinite(years) ? Math.min(25, Math.max(1, years)) : 10;
    const since = new Date(referenceDate);
    since.setFullYear(since.getFullYear() - normalizedYears);
    return since;
}

module.exports = {
    getGamesScanSinceDate,
};
