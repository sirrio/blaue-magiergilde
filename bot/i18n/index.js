const dictionaries = {
    de: require('./de'),
    en: require('./en'),
};

function resolveBotLocale(locale) {
    const normalized = String(locale || process.env.BOT_LOCALE || 'de').trim().toLowerCase();

    if (normalized.startsWith('en')) {
        return 'en';
    }

    return 'de';
}

function getNestedValue(dictionary, key) {
    return String(key)
        .split('.')
        .reduce((value, segment) => {
            if (value && typeof value === 'object' && segment in value) {
                return value[segment];
            }

            return undefined;
        }, dictionary);
}

function interpolate(template, params) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        if (!(key in params)) {
            return match;
        }

        return String(params[key]);
    });
}

function t(key, params = {}, locale) {
    const locales = [...new Set([resolveBotLocale(locale), 'de', 'en'])];

    for (const currentLocale of locales) {
        const value = getNestedValue(dictionaries[currentLocale], key);

        if (typeof value === 'string') {
            return interpolate(value, params);
        }

        if (value !== undefined) {
            return value;
        }
    }

    return key;
}

module.exports = {
    t,
    resolveBotLocale,
};
