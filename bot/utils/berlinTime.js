const BERLIN_TZ = 'Europe/Berlin';

function getBerlinOffsetMinutes(date) {
    const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: BERLIN_TZ,
        timeZoneName: 'shortOffset',
    });
    const parts = dtf.formatToParts(date instanceof Date ? date : new Date(date));
    const tzName = parts.find((part) => part.type === 'timeZoneName')?.value || 'GMT+1';
    const match = tzName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!match) return 60;
    const sign = match[1] === '-' ? -1 : 1;
    return sign * (Number(match[2]) * 60 + Number(match[3] || 0));
}

function berlinLocalToUnixSeconds(year, monthIndex, day, hour, minute, second = 0) {
    const naiveUtcMs = Date.UTC(year, monthIndex, day, hour, minute, second);
    // Two passes so we converge across DST transitions: the offset depends on the
    // local moment, so we approximate, recompute, and lock in.
    let utcMs = naiveUtcMs - getBerlinOffsetMinutes(new Date(naiveUtcMs)) * 60_000;
    utcMs = naiveUtcMs - getBerlinOffsetMinutes(new Date(utcMs)) * 60_000;
    return Math.floor(utcMs / 1000);
}

function dateToBerlinUnixSeconds(date) {
    if (!date || Number.isNaN(date.getTime?.())) return null;
    return berlinLocalToUnixSeconds(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds() || 0,
    );
}

module.exports = {
    berlinLocalToUnixSeconds,
    dateToBerlinUnixSeconds,
    getBerlinOffsetMinutes,
};
