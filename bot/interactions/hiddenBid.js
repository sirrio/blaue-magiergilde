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
    listOpenAuctionItemsForHiddenBids,
    removeHiddenBidForDiscord,
    upsertHiddenBidForDiscord,
} = require('../appDb');
const { buildErrorEmbed, buildInfoEmbed, buildSuccessEmbed } = require('../utils/noticeEmbeds');
const { updateManageMessage } = require('../utils/updateManageMessage');
const { setManageMessageTarget } = require('../utils/manageMessageTarget');

const SELECT_ID_PREFIX = 'hiddenBidSelect_';
const REFRESH_ID_PREFIX = 'hiddenBidRefresh_';
const SET_ID_PREFIX = 'hiddenBidSet_';
const REMOVE_ASK_ID_PREFIX = 'hiddenBidRemoveAsk_';
const REMOVE_CONFIRM_ID_PREFIX = 'hiddenBidRemoveConfirm_';
const REMOVE_CANCEL_ID_PREFIX = 'hiddenBidRemoveCancel_';
const MODAL_ID_PREFIX = 'hiddenBidModal_';
const MAX_OPTIONS = 25;

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

function parseOwnerIdFromCustomId(customId, prefix) {
    if (!customId || !customId.startsWith(prefix)) return null;
    const ownerId = customId.slice(prefix.length).trim();
    if (!/^[0-9]{5,}$/.test(ownerId)) return null;
    return ownerId;
}

function parseRefreshCustomId(customId) {
    const match = String(customId || '').match(/^hiddenBidRefresh_([0-9]{5,})(?:_(\d+))?$/);
    if (!match) return null;
    return {
        ownerId: match[1],
        selectedItemId: match[2] ? Number(match[2]) : null,
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

async function replyOwnerMismatch(interaction) {
    await interaction.reply({
        content: '',
        embeds: [buildErrorEmbed('Action denied', 'This hidden-bid panel is not yours.')],
        flags: MessageFlags.Ephemeral,
    });
}

function buildSelectedItemEmbed(item) {
    const currency = String(item.auction_currency || 'GP').trim() || 'GP';
    const itemName = item.item_name || `Item #${item.auction_item_id}`;
    const notes = String(item.notes || '').trim();
    const ownMax = item.user_hidden_max == null ? 'none' : `${item.user_hidden_max} ${currency}`;
    const highestBid = Number(item.highest_bid || 0);
    const highestLabel = highestBid > 0 ? `${highestBid} ${currency}` : 'none';

    const lines = [
        `Item: **${itemName}**${notes ? ` - ${notes}` : ''}`,
        `Rarity: ${formatRarityLabel(item.item_rarity)} | Type: ${String(item.item_type || 'item')}`,
        `Minimum now: **${item.min_bid} ${currency}** | Step: ${item.step}`,
        `Highest visible: ${highestLabel}`,
        `Your hidden max: **${ownMax}**`,
    ];

    return buildInfoEmbed('Selected item', lines.join('\n'));
}

function buildHiddenBidLine(item, duplicateLabelSet) {
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

    return `- **${truncateText(lineLabel, 90)}**: ${hiddenMax} ${currency} (min ${item.min_bid}, step ${item.step})`;
}

function buildDashboardEmbeds({ items, ownConfiguredCount }) {
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
        .map(item => buildHiddenBidLine(item, duplicateLabelSet))
        .filter(line => typeof line === 'string');

    const summaryLines = [
        'Select an open auction item, then use the actions below.',
        'Only you can see this interaction.',
        '',
        `Open items: **${items.length}**`,
        `Your hidden bids: **${ownConfiguredCount}**`,
    ];
    if (items.length > MAX_OPTIONS) {
        summaryLines.push(`Showing first **${MAX_OPTIONS}** items.`);
    }

    const summarySection = summaryLines.join('\n');
    const listHeader = '\n\n**Your hidden bids**\n';
    const firstPrefix = `${summarySection}${listHeader}`;
    const continuationPrefix = '**Your hidden bids (cont.)**\n';
    const maxDescriptionLength = 3800;
    const firstChunkLimit = Math.max(200, maxDescriptionLength - firstPrefix.length);
    const continuationChunkLimit = Math.max(200, maxDescriptionLength - continuationPrefix.length);

    if (configuredLines.length === 0) {
        return [buildInfoEmbed('Hidden bid dashboard', `${summarySection}${listHeader}- none yet`)];
    }

    const embeds = [];
    let currentChunkLines = [];
    let currentLength = 0;
    let chunkIndex = 1;
    let currentChunkLimit = firstChunkLimit;

    for (const line of configuredLines) {
        const addition = (currentChunkLines.length === 0 ? 0 : 1) + line.length;
        if (currentChunkLines.length > 0 && currentLength + addition > currentChunkLimit) {
            const title = chunkIndex === 1 ? 'Hidden bid dashboard' : `Hidden bid dashboard (${chunkIndex})`;
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
        const title = chunkIndex === 1 ? 'Hidden bid dashboard' : `Hidden bid dashboard (${chunkIndex})`;
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
}) {
    const items = await listOpenAuctionItemsForHiddenBids({ id: ownerId }, 250);
    const ownConfiguredCount = items.filter(item => item.user_hidden_max != null).length;
    const visibleItems = items.slice(0, MAX_OPTIONS);

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
        embeds.push(buildErrorEmbed('Selection expired', 'Selected item is no longer open.'));
    }

    embeds.push(...buildDashboardEmbeds({ items, ownConfiguredCount }));

    if (selectedItem) {
        embeds.push(buildSelectedItemEmbed(selectedItem));
    }

    const components = [];
    if (visibleItems.length > 0) {
        const options = visibleItems.map(item => {
            const summary = summarizeAuctionItem(item);
            const option = new StringSelectMenuOptionBuilder()
                .setLabel(summary.label)
                .setDescription(summary.description)
                .setValue(String(item.auction_item_id));

            if (selectedItem && Number(item.auction_item_id) === Number(selectedItem.auction_item_id)) {
                option.setDefault(true);
            }

            return option;
        });

        const select = new StringSelectMenuBuilder()
            .setCustomId(`${SELECT_ID_PREFIX}${ownerId}`)
            .setPlaceholder('Select item...')
            .addOptions(options);

        components.push(new ActionRowBuilder().addComponents(select));
    }

    if (selectedItem) {
        const actionButtons = [
            new ButtonBuilder()
                .setCustomId(`${SET_ID_PREFIX}${selectedItem.auction_item_id}_${ownerId}`)
                .setLabel(selectedItem.user_hidden_max == null ? 'Set max' : 'Update max')
                .setStyle(ButtonStyle.Primary),
        ];

        if (selectedItem.user_hidden_max != null) {
            actionButtons.push(
                new ButtonBuilder()
                    .setCustomId(`${REMOVE_ASK_ID_PREFIX}${selectedItem.auction_item_id}_${ownerId}`)
                    .setLabel('Remove hidden bid')
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
                    .setLabel('Confirm remove')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`${REMOVE_CANCEL_ID_PREFIX}${selectedItem.auction_item_id}_${ownerId}`)
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary),
            ),
        );
    }

    const refreshSelectedId = selectedItem ? selectedItem.auction_item_id : 0;
    components.push(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`${REFRESH_ID_PREFIX}${ownerId}_${refreshSelectedId}`)
                .setLabel('Refresh')
                .setStyle(ButtonStyle.Secondary),
        ),
    );

    return {
        content: '',
        embeds,
        components,
    };
}

async function showCommandPicker(interaction) {
    const ownerId = interaction.user.id;
    const payload = await buildPickerPayload({ ownerId });

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply(payload);
    }
}

async function handleSelect(interaction) {
    const ownerId = parseOwnerIdFromCustomId(interaction.customId, SELECT_ID_PREFIX);
    if (!ownerId) return false;

    if (!ensureOwner(interaction, ownerId)) {
        await replyOwnerMismatch(interaction);
        return true;
    }

    const selectedValue = interaction.values?.[0] || '';
    const auctionItemId = Number(selectedValue);
    if (!Number.isFinite(auctionItemId) || auctionItemId <= 0) {
        const payload = await buildPickerPayload({
            ownerId,
            noticeEmbed: buildErrorEmbed('Invalid item', 'Please select a valid auction item.'),
        });
        await interaction.update(payload);
        return true;
    }

    const item = await findOpenAuctionItemForHiddenBid(buildIdentityFromInteraction(interaction), auctionItemId);
    if (!item || item.auction_status !== 'open' || item.sold_at) {
        const payload = await buildPickerPayload({
            ownerId,
            noticeEmbed: buildErrorEmbed('Item unavailable', 'The selected item is no longer open.'),
        });
        await interaction.update(payload);
        return true;
    }

    const payload = await buildPickerPayload({
        ownerId,
        selectedItemId: item.auction_item_id,
    });
    await interaction.update(payload);
    return true;
}

async function handleRefresh(interaction) {
    const parsed = parseRefreshCustomId(interaction.customId);
    if (!parsed) return false;

    if (!ensureOwner(interaction, parsed.ownerId)) {
        await replyOwnerMismatch(interaction);
        return true;
    }

    const payload = await buildPickerPayload({
        ownerId: parsed.ownerId,
        selectedItemId: parsed.selectedItemId && parsed.selectedItemId > 0 ? parsed.selectedItemId : null,
    });
    await interaction.update(payload);
    return true;
}

async function handleSetAction(interaction) {
    const parsed = parseItemOwnerAction(interaction.customId, SET_ID_PREFIX);
    if (!parsed) return false;

    if (!ensureOwner(interaction, parsed.ownerId)) {
        await replyOwnerMismatch(interaction);
        return true;
    }

    const item = await findOpenAuctionItemForHiddenBid(buildIdentityFromInteraction(interaction), parsed.auctionItemId);
    if (!item || item.auction_status !== 'open' || item.sold_at) {
        const payload = await buildPickerPayload({
            ownerId: parsed.ownerId,
            noticeEmbed: buildErrorEmbed('Item unavailable', 'The selected item is no longer open.'),
        });
        await interaction.update(payload);
        return true;
    }

    const currency = String(item.auction_currency || 'GP').trim() || 'GP';
    const modal = new ModalBuilder()
        .setCustomId(`${MODAL_ID_PREFIX}${item.auction_item_id}_${parsed.ownerId}`)
        .setTitle('Set hidden max');

    const maxInput = new TextInputBuilder()
        .setCustomId('hiddenBidMaxAmount')
        .setLabel(`Max amount (${currency})`)
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(String(item.user_hidden_max ?? item.min_bid))
        .setPlaceholder(`Min ${item.min_bid}, step ${item.step}`);

    modal.addComponents(new ActionRowBuilder().addComponents(maxInput));
    await interaction.showModal(modal);
    return true;
}

async function handleRemoveAsk(interaction) {
    const parsed = parseItemOwnerAction(interaction.customId, REMOVE_ASK_ID_PREFIX);
    if (!parsed) return false;

    if (!ensureOwner(interaction, parsed.ownerId)) {
        await replyOwnerMismatch(interaction);
        return true;
    }

    const payload = await buildPickerPayload({
        ownerId: parsed.ownerId,
        selectedItemId: parsed.auctionItemId,
        removeConfirmItemId: parsed.auctionItemId,
    });
    await interaction.update(payload);
    return true;
}

async function handleRemoveCancel(interaction) {
    const parsed = parseItemOwnerAction(interaction.customId, REMOVE_CANCEL_ID_PREFIX);
    if (!parsed) return false;

    if (!ensureOwner(interaction, parsed.ownerId)) {
        await replyOwnerMismatch(interaction);
        return true;
    }

    const payload = await buildPickerPayload({
        ownerId: parsed.ownerId,
        selectedItemId: parsed.auctionItemId,
    });
    await interaction.update(payload);
    return true;
}

async function handleRemoveConfirm(interaction) {
    const parsed = parseItemOwnerAction(interaction.customId, REMOVE_CONFIRM_ID_PREFIX);
    if (!parsed) return false;

    if (!ensureOwner(interaction, parsed.ownerId)) {
        await replyOwnerMismatch(interaction);
        return true;
    }

    const result = await removeHiddenBidForDiscord(buildIdentityFromInteraction(interaction), parsed.auctionItemId);
    if (!result.ok) {
        let message = 'Could not remove hidden bid.';
        if (result.reason === 'hidden_bid_not_found') {
            message = 'No hidden bid was stored for this item.';
        } else if (result.reason === 'not_found' || result.reason === 'item_sold' || result.reason === 'auction_closed') {
            message = 'This item is no longer available for hidden bids.';
        }

        const payload = await buildPickerPayload({
            ownerId: parsed.ownerId,
            selectedItemId: parsed.auctionItemId,
            noticeEmbed: buildErrorEmbed('Remove failed', message),
        });
        await interaction.update(payload);
        return true;
    }

    const payload = await buildPickerPayload({
        ownerId: parsed.ownerId,
        selectedItemId: parsed.auctionItemId,
        noticeEmbed: buildSuccessEmbed(
            'Hidden bid removed',
            `Removed hidden bid for **${result.itemName}** (previous max ${result.previousMax} ${result.auctionCurrency}).`,
        ),
    });
    await interaction.update(payload);
    return true;
}

async function handleModal(interaction) {
    const parsed = parseModalCustomId(interaction.customId);
    if (!parsed) return false;

    if (!ensureOwner(interaction, parsed.ownerId)) {
        await replyOwnerMismatch(interaction);
        return true;
    }

    const rawInput = String(interaction.fields.getTextInputValue('hiddenBidMaxAmount') || '').replace(/\s+/g, '');
    if (!/^[0-9]+$/.test(rawInput)) {
        const payload = await buildPickerPayload({
            ownerId: parsed.ownerId,
            selectedItemId: parsed.auctionItemId,
            noticeEmbed: buildErrorEmbed('Invalid amount', 'Please enter a whole number.'),
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
        let message = 'Could not save your hidden bid.';
        if (result.reason === 'not_found' || result.reason === 'item_sold' || result.reason === 'auction_closed') {
            message = 'This item is no longer available for hidden bids.';
        } else if (result.reason === 'below_minimum') {
            message = `Minimum hidden bid is ${result.minBid} (step ${result.step}).`;
        } else if (result.reason === 'invalid_step') {
            message = `Hidden bids must follow step ${result.step}, based on start ${result.startingBid}.`;
        } else if (result.reason === 'invalid_amount') {
            message = 'Please enter a positive whole number.';
        }

        const payload = await buildPickerPayload({
            ownerId: parsed.ownerId,
            selectedItemId: parsed.auctionItemId,
            noticeEmbed: buildErrorEmbed('Hidden bid rejected', message),
        });
        await updateManageMessage(interaction, payload);
        return true;
    }

    const actionText = result.previousMax == null ? 'created' : 'updated';
    const payload = await buildPickerPayload({
        ownerId: parsed.ownerId,
        selectedItemId: parsed.auctionItemId,
        noticeEmbed: buildSuccessEmbed(
            'Hidden bid saved',
            `Your hidden max for **${result.itemName}** is now **${result.maxAmount} ${result.auctionCurrency}** (${actionText}).`,
        ),
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
};
