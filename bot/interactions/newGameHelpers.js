const { t } = require('../i18n');

function isThreadChannel(channel) {
    return Boolean(channel?.isThread?.());
}

function threadRestrictionMessage(locale = null) {
    return t('newGame.threadRestriction', {}, locale);
}

module.exports = { isThreadChannel, threadRestrictionMessage };
