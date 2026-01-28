function getGamesScanSinceDate(referenceDate = new Date()) {
    const since = new Date(referenceDate);
    since.setFullYear(since.getFullYear() - 5);
    return since;
}

module.exports = {
    getGamesScanSinceDate,
};
