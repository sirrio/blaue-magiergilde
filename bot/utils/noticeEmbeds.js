const { EmbedBuilder } = require('discord.js');

const NOTICE_COLORS = {
    info: 0x4f46e5,
    success: 0x22c55e,
    warning: 0xf59e0b,
    error: 0xef4444,
};

function withErrorPrefix(title) {
    const cleanTitle = String(title || '').trim() || 'Error';
    if (cleanTitle.startsWith('⚠') || cleanTitle.startsWith('❌') || cleanTitle.startsWith('⛔')) {
        return cleanTitle;
    }

    return `⚠️ ${cleanTitle}`;
}

function buildNoticeEmbed({ title, description = '', kind = 'info' }) {
    const color = NOTICE_COLORS[kind] || NOTICE_COLORS.info;
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(String(title || 'Notice'))
        .setTimestamp(new Date());

    const cleanDescription = String(description || '').trim();
    if (cleanDescription !== '') {
        embed.setDescription(cleanDescription);
    }

    return embed;
}

function buildInfoEmbed(title, description = '') {
    return buildNoticeEmbed({ title, description, kind: 'info' });
}

function buildSuccessEmbed(title, description = '') {
    return buildNoticeEmbed({ title, description, kind: 'success' });
}

function buildWarningEmbed(title, description = '') {
    return buildNoticeEmbed({ title, description, kind: 'warning' });
}

function buildErrorEmbed(title, description = '') {
    return buildNoticeEmbed({ title: withErrorPrefix(title), description, kind: 'error' });
}

module.exports = {
    buildNoticeEmbed,
    buildInfoEmbed,
    buildSuccessEmbed,
    buildWarningEmbed,
    buildErrorEmbed,
};
