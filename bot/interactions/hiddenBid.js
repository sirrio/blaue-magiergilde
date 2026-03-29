const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ModalBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');
const {
    findOpenAuctionItemForHiddenBid,
    getUserLocaleByDiscordId,
    listOpenAuctionItemsForHiddenBids,
    removeHiddenBidForDiscord,
    upsertHiddenBidForDiscord,
} = require('../appDb');
const { t } = require('../i18n');
const { buildErrorEmbed, buildInfoEmbed, buildSuccessEmbed } = require('../utils/noticeEmbeds');
const { updateManageMessage } = require('../utils/updateManageMessage');
const { setManageMessageTarget } = require('../utils/manageMessageTarget');

const SELECT_ID_PREFIX = 'hiddenBidSelect_';
const REFRESH_ID_PREFIX = 'hiddenBidRefresh_';
const PAGE_NAV_ID_PREFIX = 'hiddenBidPageNav_';
const PAGE_STATUS_ID_PREFIX = 'hiddenBidPageStatus_';
const SET_ID_PREFIX = 'hiddenBidSet_';
const REMOVE_ASK_ID_PREFIX = 'hiddenBidRemoveAsk_';
const REMOVE_CONFIRM_ID_PREFIX = 'hiddenBidRemoveConfirm_';
const REMOVE_CANCEL_ID_PREFIX = 'hiddenBidRemoveCancel_';
const MODAL_ID_PREFIX = 'hiddenBidModal_';
const MAX_OPTIONS = 25;
const RARITY_ORDER = new Map([
    ['common', 0],
    ['uncommon', 1],
    ['rare', 2],
    ['very_rare', 3],
    ['legendary', 4],
    ['artifact', 5],
    ['unknown_rarity', 6],
]);
const TYPE_ORDER = new Map([
    ['weapon', 0],
    ['armor', 1],
    ['item', 2],
    ['consumable', 3],
    ['spellscroll', 4],
]);

function buildRefreshCustomId(ownerId, selectedItemId, page) {
    return `${REFRESH_ID_PREFIX}${ownerId}_${selectedItemId}_${page}`;
}

function buildPageNavCustomId(ownerId, selectedItemId, page) {
    return `${PAGE_NAV_ID_PREFIX}${ownerId}_${selectedItemId}_${page}`;
}

function buildPageStatusCustomId(ownerId, page) {
    return `${PAGE_STATUS_ID_PREFIX}${ownerId}_${page}`;
}

function truncateText(value, maxLength) {
    const text = String(value || '').trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

function formatRarityLabel(rarity) {
    const clean = String(rarity || 'common').trim().toLowerCase();
    if (clean === 'unknown_rarity') return 'Unknown rarity';
    if (clean === 'artifact') return 'Artifact';
    if (clean === 'legendary') return 'Legendary';
    if (clean === 'very_rare') return 'Very Rare';
    if (clean === 'rare') return 'Rare';
    if (clean === 'uncommon') return 'Uncommon';
    return 'Common';
}

function sortItemsLikeAuctionPage(items) {
    return [...items].sort((left, right) => {
        const auctionDateDelta = new Date(right.auction_created_at || 0).getTime() - new Date(left.auction_created_at || 0).getTime();
        if (auctionDateDelta !== 0) {
            return auctionDateDelta;
        }

        const rarityDelta = (RARITY_ORDER.get(String(left.item_rarity || '').trim().toLowerCase()) ?? 999)
            - (RARITY_ORDER.get(String(right.item_rarity || '').trim().toLowerCase()) ?? 999);
        if (rarityDelta !== 0) {
            return rarityDelta;
        }

        const typeDelta = (TYPE_ORDER.get(String(left.item_type || '').trim().toLowerCase()) ?? 999)
            - (TYPE_ORDER.get(String(right.item_type || '').trim().toLowerCase()) ?? 999);
        if (typeDelta !== 0) {
            return typeDelta;
        }

        const nameDelta = String(left.item_name || '').localeCompare(String(right.item_name || ''), 'de', { sensitivity: 'base' });
        if (nameDelta !== 0) {
            return nameDelta;
        }

        return Number(left.auction_item_id || 0) - Number(right.auction_item_id || 0);
    });
}

function summarizeAuctionItem(item) {
    const currency = String(item.auction_currency || 'GP').trim() || 'GP';
    const itemName = item.item_name || `Item #${item.auction_item_id}`;
    const notes = String(item.notes || '').trim();
    const label = notes ? `${itemName} - ${notes}` : itemName;
    const ownMax = item.user_hidden_max == null ? 'none' : `${item.user_hidden_max} ${currency}`;
    const description = `${formatRarityLabel(item.item_rarity)} | Min ${item.min_bid} ${currency} | Yours ${ownMax}`;

    return {
        label: truncateText(label, 100),
        description: truncateText(description, 100),
    };
}

function buildIdentityFromInteraction(interaction) {
    return {
        id: interaction?.user?.id,
        username: interaction?.user?.username,
        globalName: interaction?.user?.globalName,
        tag: interaction?.user?.tag,
        displayName: interaction?.member?.displayName,
    };
}

async function resolveInteractionLocale(interaction) {
    return await getUserLocaleByDiscordId(interaction?.user?.id);
}

function parseSelectCustomId(customId) {
    const match = String(customId || '').match(/^hiddenBidSelect_([0-9]{5,})(?:_(\d+))?$/);
    if (!match) return null;
    return {
        ownerId: match[1],
        page: match[2] ? Number(match[2]) : null,
    };
}

function parseRefreshCustomId(customId) {
    const match = String(customId || '').match(/^hiddenBidRefresh_([0-9]{5,})(?:_(\d+))?(?:_(\d+))?$/);
    if (!match) return null;
    return {
        ownerId: match[1],
        selectedItemId: match[2] ? Number(match[2]) : null,
        page: match[3] ? Number(match[3]) : null,
    };
}

function parsePageNavCustomId(customId) {
    const match = String(customId || '').match(/^hiddenBidPageNav_([0-9]{5,})_(\d+)_(\d+)$/);
    if (!match) return null;
    return {
        ownerId: match[1],
        selectedItemId: Number(match[2]),
        page: Number(match[3]),
    };
}

function parseItemOwnerAction(customId, prefix) {
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = String(customId || '').match(new RegExp(`^${escapedPrefix}(\\d+)_([0-9]{5,})$`));
    if (!match) return null;
    return {
        auctionItemId: Number(match[1]),
        ownerId: match[2],
    };
}

function parseModalCustomId(customId) {
    const match = String(customId || '').match(/^hiddenBidModal_(\d+)_([0-9]{5,})$/);
    if (!match) return null;
    return {
        auctionItemId: Number(match[1]),
        ownerId: match[2],
    };
}

function ensureOwner(interaction, ownerId) {
    return interaction.user.id === ownerId;
}

async function replyOwnerMismatch(interaction, locale = null) {
    await interaction.reply({
        content: '',
        embeds: [buildErrorEmbed(t('hiddenBid.actionDeniedTitle', {}, locale), t('hiddenBid.actionDeniedBody', {}, locale))],
        flags: MessageFlags.Ephemeral,
    });
}

function buildSelectedItemEmbed(item, locale = null) {
    const currency = String(item.auction_currency || 'GP').trim() || 'GP';
    const itemName = item.item_name || `Item #${item.auction_item_id}`;
    const notes = String(item.notes || '').trim();
    const ownMax = item.user_hidden_max == null ? t('hiddenBid.noneValue', {}, locale) : `${item.user_hidden_max} ${currency}`;
    const highestBid = Number(item.highest_bid || 0);
    const highestLabel = highestBid > 0 ? `${highestBid} ${currency}` : t('hiddenBid.noneValue', {}, locale);

    const lines = [
        `${t('hiddenBid.selectedItemLabel', {}, locale)}: **${itemName}**${notes ? ` - ${notes}` : ''}`,
        t('hiddenBid.selectedItemRarityType', {
            rarity: formatRarityLabel(item.item_rarity),
            type: String(item.item_type || 'item'),
        }, locale),
        t('hiddenBid.selectedItemMinimum', {
            minBid: item.min_bid,
            currency,
            step: item.step,
        }, locale),
        t('hiddenBid.selectedItemHighestVisible', { highestBid: highestLabel }, locale),
        t('hiddenBid.selectedItemOwnMax', { ownMax }, locale),
    ];

    return buildInfoEmbed(t('hiddenBid.selectedItemTitle', {}, locale), lines.join('\n'));
}

function buildHiddenBidLine(item, duplicateLabelSet, locale = null) {
    const currency = String(item.auction_currency || 'GP').trim() || 'GP';
    const itemName = item.item_name || `Item #${item.auction_item_id}`;
    const notes = String(item.notes || '').trim();
    const itemLabel = notes ? `${itemName} - ${notes}` : itemName;
    const normalizedLabel = itemLabel.trim().toLowerCase();
    const lineLabel = duplicateLabelSet.has(normalizedLabel)
        ? `${itemLabel} (#${item.auction_item_id})`
        : itemLabel;
    const hiddenMax = item.user_hidden_max == null ? null : Number(item.user_hidden_max);
    if (!Number.isFinite(hiddenMax)) {
        return null;
    }

    return t('hiddenBid.hiddenBidLine', {
        itemLabel: truncateText(lineLabel, 90),
        hiddenMax,
        currency,
        minBid: item.min_bid,
        step: item.step,
    }, locale);
}

function getPickerPageMeta(items, requestedPage = null, selectedItemId = null) {
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / MAX_OPTIONS));
    let currentPage = Number(requestedPage);

    if (!Number.isFinite(currentPage) || currentPage < 1) {
        const selectedId = Number(selectedItemId);
        if (Number.isFinite(selectedId) && selectedId > 0) {
            const selectedIndex = items.findIndex(item => Number(item.auction_item_id) === selectedId);
            if (selectedIndex >= 0) {
                currentPage = Math.floor(selectedIndex / MAX_OPTIONS) + 1;
            }
        }
    }

    if (!Number.isFinite(currentPage) || currentPage < 1) {
        currentPage = 1;
    }

    currentPage = Math.min(totalPages, currentPage);

    const startIndex = (currentPage - 1) * MAX_OPTIONS;
    const endIndex = Math.min(startIndex + MAX_OPTIONS, totalItems);

    return {
        currentPage,
        totalPages,
        startIndex,
        endIndex,
        visibleItems: items.slice(startIndex, endIndex),
        from: totalItems === 0 ? 0 : startIndex + 1,
        to: endIndex,
        totalItems,
    };
}

function buildDashboardEmbeds({ items, ownConfiguredCount, locale = null, pageMeta = null }) {
    const configuredItems = items
        .filter(item => item.user_hidden_max != null)
        .sort((a, b) => {
            const amountDelta = Number(b.user_hidden_max || 0) - Number(a.user_hidden_max || 0);
            if (amountDelta !== 0) return amountDelta;
            const createdA = new Date(a.auction_created_at || 0).getTime();
            const createdB = new Date(b.auction_created_at || 0).getTime();
            return createdB - createdA;
        });

    const labelCounts = new Map();
    for (const item of configuredItems) {
        const itemName = item.item_name || `Item #${item.auction_item_id}`;
        const notes = String(item.notes || '').trim();
        const itemLabel = notes ? `${itemName} - ${notes}` : itemName;
        const key = itemLabel.trim().toLowerCase();
        labelCounts.set(key, (labelCounts.get(key) || 0) + 1);
    }
    const duplicateLabelSet = new Set(
        [...labelCounts.entries()]
            .filter(([, count]) => count > 1)
            .map(([key]) => key),
    );
    const configuredLines = configuredItems
        .map(item => buildHiddenBidLine(item, duplicateLabelSet, locale))
        .filter(line => typeof line === 'string');

    const summaryLines = [
        t('hiddenBid.summaryIntro', {}, locale),
        t('hiddenBid.summaryVisibility', {}, locale),
        '',
        t('hiddenBid.openItems', { count: items.length }, locale),
        t('hiddenBid.ownBids', { count: ownConfiguredCount }, locale),
    ];
    if (pageMeta && pageMeta.totalItems > 0) {
        summaryLines.push(t('hiddenBid.showingRange', {
            from: pageMeta.from,
            to: pageMeta.to,
            total: pageMeta.totalItems,
            page: pageMeta.currentPage,
            totalPages: pageMeta.totalPages,
        }, locale));
    }

    const summarySection = summaryLines.join('\n');
    const listHeader = `\n\n${t('hiddenBid.ownBidsHeader', {}, locale)}\n`;
    const firstPrefix = `${summarySection}${listHeader}`;
    const continuationPrefix = `${t('hiddenBid.ownBidsContinuation', {}, locale)}\n`;
    const maxDescriptionLength = 3800;
    const firstChunkLimit = Math.max(200, maxDescriptionLength - firstPrefix.length);
    const continuationChunkLimit = Math.max(200, maxDescriptionLength - continuationPrefix.length);

    if (configuredLines.length === 0) {
        return [buildInfoEmbed(t('hiddenBid.dashboardTitle', {}, locale), `${summarySection}${listHeader}${t('hiddenBid.noneYet', {}, locale)}`)];
    }

    const embeds = [];
    let currentChunkLines = [];
    let currentLength = 0;
    let chunkIndex = 1;
    let currentChunkLimit = firstChunkLimit;

    for (const line of configuredLines) {
        const addition = (currentChunkLines.length === 0 ? 0 : 1) + line.length;
        if (currentChunkLines.length > 0 && currentLength + addition > currentChunkLimit) {
            const title = chunkIndex === 1
                ? t('hiddenBid.dashboardTitle', {}, locale)
                : t('hiddenBid.dashboardTitleContinuation', { index: chunkIndex }, locale);
            const description = chunkIndex === 1
                ? `${firstPrefix}${currentChunkLines.join('\n')}`
                : `${continuationPrefix}${currentChunkLines.join('\n')}`;
            embeds.push(buildInfoEmbed(title, description));
            chunkIndex += 1;
            currentChunkLines = [line];
            currentLength = line.length;
            currentChunkLimit = continuationChunkLimit;
            continue;
        }

        currentChunkLines.push(line);
        currentLength += addition;
    }

    if (currentChunkLines.length > 0) {
        const title = chunkIndex === 1
            ? t('hiddenBid.dashboardTitle', {}, locale)
            : t('hiddenBid.dashboardTitleContinuation', { index: chunkIndex }, locale);
        const description = chunkIndex === 1
            ? `${firstPrefix}${currentChunkLines.join('\n')}`
            : `${continuationPrefix}${currentChunkLines.join('\n')}`;
        embeds.push(buildInfoEmbed(title, description));
    }

    return embeds;
}

async function buildPickerPayload({
    ownerId,
    noticeEmbed = null,
    selectedItemId = null,
    removeConfirmItemId = null,
    page = null,
    locale = null,
}) {
    const items = sortItemsLikeAuctionPage(await listOpenAuctionItemsForHiddenBids({ id: ownerId }, 250));
    const ownConfiguredCount = items.filter(item => item.user_hidden_max != null).length;
    const pageMeta = getPickerPageMeta(items, page, selectedItemId);
    const visibleItems = pageMeta.visibleItems;

    const itemById = new Map(items.map(item => [Number(item.auction_item_id), item]));
    const selectedId = Number(selectedItemId);
    const selectedItem = Number.isFinite(selectedId) ? (itemById.get(selectedId) || null) : null;
    const showRemoveConfirm = selectedItem
        && selectedItem.user_hidden_max != null
        && Number(removeConfirmItemId) === Number(selectedItem.auction_item_id);

    const embeds = [];
    if (noticeEmbed) {
        embeds.push(noticeEmbed);
    }

    if (selectedItemId && !selectedItem && !noticeEmbed) {
        embeds.push(buildErrorEmbed(t('hiddenBid.itemUnavailableTitle', {}, locale), t('hiddenBid.itemUnavailableBody', {}, locale)));
    }

    embeds.push(...buildDashboardEmbeds({ items, ownConfiguredCount, locale, pageMeta }));

    if (selectedItem) {
        embeds.push(buildSelectedItemEmbed(selectedItem, locale));
    }

    const components = [];
    if (visibleItems.length > 0) {
        const options = visibleItems.map(item => {
            const summary = summarizeAuctionItem(item);
            const currency = String(item.auction_currency || 'GP').trim() || 'GP';
            const ownMax = item.user_hidden_max == null ? t('hiddenBid.noneValue', {}, locale) : `${item.user_hidden_max} ${currency}`;
            const option = new StringSelectMenuOptionBuilder()
                .setLabel(summary.label)
                .setDescription(truncateText(t('hiddenBid.selectDescription', {
                    rarity: formatRarityLabel(item.item_rarity),
                    minBid: item.min_bid,
                    currency,
                    ownMax,
                }, locale), 100))
                .setValue(String(item.auction_item_id));

            if (selectedItem && Number(item.auction_item_id) === Number(selectedItem.auction_item_id)) {
                option.setDefault(true);
            }

            return option;
        });

        const select = new StringSelectMenuBuilder()
            .setCustomId(`${SELECT_ID_PREFIX}${ownerId}_${pageMeta.currentPage}`)
            .setPlaceholder(t('hiddenBid.selectPlaceholder', {}, locale))
            .addOptions(options);

        components.push(new ActionRowBuilder().addComponents(select));
    }

    if (selectedItem) {
        const actionButtons = [
            new ButtonBuilder()
                .setCustomId(`${SET_ID_PREFIX}${selectedItem.auction_item_id}_${ownerId}`)
                .setLabel(t(selectedItem.user_hidden_max == null ? 'hiddenBid.setMax' : 'hiddenBid.updateMax', {}, locale))
                .setStyle(ButtonStyle.Primary),
        ];

        if (selectedItem.user_hidden_max != null) {
            actionButtons.push(
                new ButtonBuilder()
                    .setCustomId(`${REMOVE_ASK_ID_PREFIX}${selectedItem.auction_item_id}_${ownerId}`)
                    .setLabel(t('hiddenBid.removeBid', {}, locale))
                    .setStyle(ButtonStyle.Danger),
            );
        }

        components.push(new ActionRowBuilder().addComponents(actionButtons));
    }

    if (showRemoveConfirm && selectedItem) {
        components.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`${REMOVE_CONFIRM_ID_PREFIX}${selectedItem.auction_item_id}_${ownerId}`)
                    .setLabel(t('hiddenBid.confirmRemove', {}, locale))
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`${REMOVE_CANCEL_ID_PREFIX}${selectedItem.auction_item_id}_${ownerId}`)
                    .setLabel(t('common.cancel', {}, locale))
                    .setStyle(ButtonStyle.Secondary),
            ),
        );
    }

    const refreshSelectedId = selectedItem ? selectedItem.auction_item_id : 0;
    components.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(buildRefreshCustomId(ownerId, refreshSelectedId, pageMeta.currentPage))
                    .setLabel(t('hiddenBid.refresh', {}, locale))
                    .setStyle(ButtonStyle.Secondary),
        ),
    );

    if (pageMeta.totalPages > 1) {
        components.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(buildPageNavCustomId(ownerId, refreshSelectedId, Math.max(1, pageMeta.currentPage - 1)))
                    .setLabel(t('hiddenBid.previousPage', {}, locale))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(pageMeta.currentPage <= 1),
                new ButtonBuilder()
                    .setCustomId(buildPageStatusCustomId(ownerId, pageMeta.currentPage))
                    .setLabel(t('hiddenBid.pageIndicator', {
                        page: pageMeta.currentPage,
                        totalPages: pageMeta.totalPages,
                    }, locale))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(buildPageNavCustomId(ownerId, refreshSelectedId, Math.min(pageMeta.totalPages, pageMeta.currentPage + 1)))
                    .setLabel(t('hiddenBid.nextPage', {}, locale))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(pageMeta.currentPage >= pageMeta.totalPages),
            ),
        );
    }

    return {
        content: '',
        embeds,
        components,
    };
}

async function showCommandPicker(interaction) {
    const ownerId = interaction.user.id;
    const locale = await resolveInteractionLocale(interaction);
    const payload = await buildPickerPayload({ ownerId, locale });

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply(payload);
    }
}

async function handleSelect(interaction) {
    const parsed = parseSelectCustomId(interaction.customId);
    if (!parsed) return false;
    const locale = await resolveInteractionLocale(interaction);

    if (!ensureOwner(interaction, parsed.ownerId)) {
        await replyOwnerMismatch(interaction, locale);
        return true;
    }

    const selectedValue = interaction.values?.[0] || '';
    const auctionItemId = Number(selectedValue);
    if (!Number.isFinite(auctionItemId) || auctionItemId <= 0) {
        const payload = await buildPickerPayload({
            ownerId: parsed.ownerId,
            page: parsed.page,
            locale,
            noticeEmbed: buildErrorEmbed(t('hiddenBid.invalidItemTitle', {}, locale), t('hiddenBid.invalidItemBody', {}, locale)),
        });
        await interaction.update(payload);
        return true;
    }

    const item = await findOpenAuctionItemForHiddenBid(buildIdentityFromInteraction(interaction), auctionItemId);
    if (!item || item.auction_status !== 'open' || item.sold_at) {
        const payload = await buildPickerPayload({
            ownerId: parsed.ownerId,
            page: parsed.page,
            locale,
            noticeEmbed: buildErrorEmbed(t('hiddenBid.itemUnavailableTitle', {}, locale), t('hiddenBid.itemUnavailableBody', {}, locale)),
        });
        await interaction.update(payload);
        return true;
    }

    const payload = await buildPickerPayload({
        ownerId: parsed.ownerId,
        selectedItemId: item.auction_item_id,
        page: parsed.page,
        locale,
    });
    await interaction.update(payload);
    return true;
}

async function handleRefresh(interaction) {
    const parsed = parseRefreshCustomId(interaction.customId);
    if (!parsed) return false;
    const locale = await resolveInteractionLocale(interaction);

    if (!ensureOwner(interaction, parsed.ownerId)) {
        await replyOwnerMismatch(interaction, locale);
        return true;
    }

    const payload = await buildPickerPayload({
        ownerId: parsed.ownerId,
        selectedItemId: parsed.selectedItemId && parsed.selectedItemId > 0 ? parsed.selectedItemId : null,
        page: parsed.page,
        locale,
    });
    await interaction.update(payload);
    return true;
}

async function handlePageNav(interaction) {
    const parsed = parsePageNavCustomId(interaction.customId);
    if (!parsed) return false;
    const locale = await resolveInteractionLocale(interaction);

    if (!ensureOwner(interaction, parsed.ownerId)) {
        await replyOwnerMismatch(interaction, locale);
        return true;
    }

    const payload = await buildPickerPayload({
        ownerId: parsed.ownerId,
        selectedItemId: parsed.selectedItemId > 0 ? parsed.selectedItemId : null,
        page: parsed.page,
        locale,
    });
    await interaction.update(payload);
    return true;
}

async function handleSetAction(interaction) {
    const parsed = parseItemOwnerAction(interaction.customId, SET_ID_PREFIX);
    if (!parsed) return false;
    const locale = await resolveInteractionLocale(interaction);

    if (!ensureOwner(interaction, parsed.ownerId)) {
        await replyOwnerMismatch(interaction, locale);
        return true;
    }

    const item = await findOpenAuctionItemForHiddenBid(buildIdentityFromInteraction(interaction), parsed.auctionItemId);
    if (!item || item.auction_status !== 'open' || item.sold_at) {
        const payload = await buildPickerPayload({
            ownerId: parsed.ownerId,
            locale,
            noticeEmbed: buildErrorEmbed(t('hiddenBid.itemUnavailableTitle', {}, locale), t('hiddenBid.itemUnavailableBody', {}, locale)),
        });
        await interaction.update(payload);
        return true;
    }

    const currency = String(item.auction_currency || 'GP').trim() || 'GP';
    const modal = new ModalBuilder()
        .setCustomId(`${MODAL_ID_PREFIX}${item.auction_item_id}_${parsed.ownerId}`)
        .setTitle(t('hiddenBid.setModalTitle', {}, locale));

    const maxInput = new TextInputBuilder()
        .setCustomId('hiddenBidMaxAmount')
        .setLabel(t('hiddenBid.setModalLabel', { currency }, locale))
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(String(item.user_hidden_max ?? item.min_bid))
        .setPlaceholder(t('hiddenBid.setModalPlaceholder', { minBid: item.min_bid, step: item.step }, locale));

    modal.addComponents(new ActionRowBuilder().addComponents(maxInput));
    await interaction.showModal(modal);
    return true;
}

async function handleRemoveAsk(interaction) {
    const parsed = parseItemOwnerAction(interaction.customId, REMOVE_ASK_ID_PREFIX);
    if (!parsed) return false;
    const locale = await resolveInteractionLocale(interaction);

    if (!ensureOwner(interaction, parsed.ownerId)) {
        await replyOwnerMismatch(interaction, locale);
        return true;
    }

    const payload = await buildPickerPayload({
        ownerId: parsed.ownerId,
        selectedItemId: parsed.auctionItemId,
        removeConfirmItemId: parsed.auctionItemId,
        locale,
    });
    await interaction.update(payload);
    return true;
}

async function handleRemoveCancel(interaction) {
    const parsed = parseItemOwnerAction(interaction.customId, REMOVE_CANCEL_ID_PREFIX);
    if (!parsed) return false;
    const locale = await resolveInteractionLocale(interaction);

    if (!ensureOwner(interaction, parsed.ownerId)) {
        await replyOwnerMismatch(interaction, locale);
        return true;
    }

    const payload = await buildPickerPayload({
        ownerId: parsed.ownerId,
        selectedItemId: parsed.auctionItemId,
        locale,
    });
    await interaction.update(payload);
    return true;
}

async function handleRemoveConfirm(interaction) {
    const parsed = parseItemOwnerAction(interaction.customId, REMOVE_CONFIRM_ID_PREFIX);
    if (!parsed) return false;
    const locale = await resolveInteractionLocale(interaction);

    if (!ensureOwner(interaction, parsed.ownerId)) {
        await replyOwnerMismatch(interaction, locale);
        return true;
    }

    const result = await removeHiddenBidForDiscord(buildIdentityFromInteraction(interaction), parsed.auctionItemId);
    if (!result.ok) {
        let message = t('hiddenBid.removeFailedBody', {}, locale);
        if (result.reason === 'hidden_bid_not_found') {
            message = t('hiddenBid.removeFailedMissing', {}, locale);
        } else if (result.reason === 'not_found' || result.reason === 'item_sold' || result.reason === 'auction_closed') {
            message = t('hiddenBid.removeFailedUnavailable', {}, locale);
        }

        const payload = await buildPickerPayload({
            ownerId: parsed.ownerId,
            selectedItemId: parsed.auctionItemId,
            locale,
            noticeEmbed: buildErrorEmbed(t('hiddenBid.removeFailedTitle', {}, locale), message),
        });
        await interaction.update(payload);
        return true;
    }

    const payload = await buildPickerPayload({
        ownerId: parsed.ownerId,
        selectedItemId: parsed.auctionItemId,
        noticeEmbed: buildSuccessEmbed(
            t('hiddenBid.removedTitle', {}, locale),
            t('hiddenBid.removedBody', {
                itemName: result.itemName,
                previousMax: result.previousMax,
                currency: result.auctionCurrency,
            }, locale),
        ),
        locale,
    });
    await interaction.update(payload);
    return true;
}

async function handleModal(interaction) {
    const parsed = parseModalCustomId(interaction.customId);
    if (!parsed) return false;
    const locale = await resolveInteractionLocale(interaction);

    if (!ensureOwner(interaction, parsed.ownerId)) {
        await replyOwnerMismatch(interaction, locale);
        return true;
    }

    const rawInput = String(interaction.fields.getTextInputValue('hiddenBidMaxAmount') || '').replace(/\s+/g, '');
    if (!/^[0-9]+$/.test(rawInput)) {
        const payload = await buildPickerPayload({
            ownerId: parsed.ownerId,
            selectedItemId: parsed.auctionItemId,
            locale,
            noticeEmbed: buildErrorEmbed(t('hiddenBid.invalidAmountTitle', {}, locale), t('hiddenBid.invalidAmountBody', {}, locale)),
        });
        await updateManageMessage(interaction, payload);
        return true;
    }

    const result = await upsertHiddenBidForDiscord(
        buildIdentityFromInteraction(interaction),
        parsed.auctionItemId,
        Number(rawInput),
    );

    if (!result.ok) {
        let message = t('hiddenBid.saveFailedBody', {}, locale);
        if (result.reason === 'not_found' || result.reason === 'item_sold' || result.reason === 'auction_closed') {
            message = t('hiddenBid.saveFailedUnavailable', {}, locale);
        } else if (result.reason === 'below_minimum') {
            message = t('hiddenBid.saveFailedMinimum', { minBid: result.minBid, step: result.step }, locale);
        } else if (result.reason === 'invalid_step') {
            message = t('hiddenBid.saveFailedStep', { step: result.step, startingBid: result.startingBid }, locale);
        } else if (result.reason === 'invalid_amount') {
            message = t('hiddenBid.saveFailedInvalid', {}, locale);
        }

        const payload = await buildPickerPayload({
            ownerId: parsed.ownerId,
            selectedItemId: parsed.auctionItemId,
            locale,
            noticeEmbed: buildErrorEmbed(t('hiddenBid.rejectedTitle', {}, locale), message),
        });
        await updateManageMessage(interaction, payload);
        return true;
    }

    const actionText = t(result.previousMax == null ? 'hiddenBid.savedCreated' : 'hiddenBid.savedUpdated', {}, locale);
    const payload = await buildPickerPayload({
        ownerId: parsed.ownerId,
        selectedItemId: parsed.auctionItemId,
        noticeEmbed: buildSuccessEmbed(
            t('hiddenBid.savedTitle', {}, locale),
            t('hiddenBid.savedBody', {
                itemName: result.itemName,
                maxAmount: result.maxAmount,
                currency: result.auctionCurrency,
                actionText,
            }, locale),
        ),
        locale,
    });
    await updateManageMessage(interaction, payload);
    return true;
}

async function handle(interaction) {
    if (interaction.isMessageComponent?.()) {
        setManageMessageTarget(interaction);
    }

    if (interaction.isButton()) {
        if (await handleRefresh(interaction)) return true;
        if (await handlePageNav(interaction)) return true;
        if (await handleSetAction(interaction)) return true;
        if (await handleRemoveAsk(interaction)) return true;
        if (await handleRemoveConfirm(interaction)) return true;
        if (await handleRemoveCancel(interaction)) return true;
        return false;
    }

    if (interaction.isStringSelectMenu()) {
        if (await handleSelect(interaction)) return true;
        return false;
    }

    if (interaction.isModalSubmit()) {
        if (await handleModal(interaction)) return true;
        return false;
    }

    return false;
}

module.exports = {
    handle,
    showCommandPicker,
    buildDashboardEmbeds,
    buildSelectedItemEmbed,
    getPickerPageMeta,
    buildRefreshCustomId,
    buildPageNavCustomId,
    buildPageStatusCustomId,
    sortItemsLikeAuctionPage,
};
