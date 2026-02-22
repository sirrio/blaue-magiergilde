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
    upsertHiddenBidForDiscord,
} = require('../appDb');
const { buildErrorEmbed, buildInfoEmbed, buildSuccessEmbed } = require('../utils/noticeEmbeds');
const { updateManageMessage } = require('../utils/updateManageMessage');
const { setManageMessageTarget } = require('../utils/manageMessageTarget');

const SELECT_ID_PREFIX = 'hiddenBidSelect_';
const REFRESH_ID_PREFIX = 'hiddenBidRefresh_';
const MODAL_ID_PREFIX = 'hiddenBidModal_';
const MAX_OPTIONS = 25;

function truncateText(value, maxLength) {
    const text = String(value || '').trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

function formatRarityLabel(rarity) {
    const clean = String(rarity || 'common').trim().toLowerCase();
    if (clean === 'very_rare') return 'Very rare';
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

function buildHiddenBidLine(item) {
    const currency = String(item.auction_currency || 'GP').trim() || 'GP';
    const itemName = item.item_name || `Item #${item.auction_item_id}`;
    const notes = String(item.notes || '').trim();
    const itemLabel = notes ? `${itemName} - ${notes}` : itemName;
    const hiddenMax = item.user_hidden_max == null ? null : Number(item.user_hidden_max);
    if (!Number.isFinite(hiddenMax)) {
        return null;
    }

    const auctionTitle = String(item.auction_title || '').trim();
    const context = auctionTitle ? ` (${auctionTitle})` : '';
    const line = `• **${truncateText(itemLabel, 90)}**${context}\n  Max: **${hiddenMax} ${currency}** · Min now: ${item.min_bid} · Step: ${item.step}`;
    return line;
}

function buildHiddenBidEmbeds(items) {
    const configured = items
        .filter(item => item.user_hidden_max != null)
        .sort((a, b) => {
            const amountDelta = Number(b.user_hidden_max || 0) - Number(a.user_hidden_max || 0);
            if (amountDelta !== 0) return amountDelta;
            const createdA = new Date(a.auction_created_at || 0).getTime();
            const createdB = new Date(b.auction_created_at || 0).getTime();
            return createdB - createdA;
        })
        .map(buildHiddenBidLine)
        .filter(line => typeof line === 'string');

    if (configured.length === 0) {
        return [
            buildInfoEmbed(
                'Your hidden bids',
                'You have no hidden bids yet.',
            ),
        ];
    }

    const embeds = [];
    let currentChunk = [];
    let currentLength = 0;
    let chunkIndex = 1;
    const MAX_DESCRIPTION = 3800;

    for (const line of configured) {
        const addition = (currentChunk.length === 0 ? 0 : 2) + line.length;
        if (currentChunk.length > 0 && currentLength + addition > MAX_DESCRIPTION) {
            embeds.push(
                buildInfoEmbed(
                    `Your hidden bids (${chunkIndex})`,
                    currentChunk.join('\n\n'),
                ),
            );
            chunkIndex += 1;
            currentChunk = [line];
            currentLength = line.length;
            continue;
        }

        currentChunk.push(line);
        currentLength += addition;
    }

    if (currentChunk.length > 0) {
        embeds.push(
            buildInfoEmbed(
                `Your hidden bids${embeds.length > 0 ? ` (${chunkIndex})` : ''}`,
                currentChunk.join('\n\n'),
            ),
        );
    }

    return embeds;
}

function parseOwnerIdFromCustomId(customId, prefix) {
    if (!customId || !customId.startsWith(prefix)) return null;
    const ownerId = customId.slice(prefix.length).trim();
    if (!/^[0-9]{5,}$/.test(ownerId)) return null;
    return ownerId;
}

function parseModalCustomId(customId) {
    const match = String(customId || '').match(/^hiddenBidModal_(\d+)_([0-9]{5,})$/);
    if (!match) return null;
    return {
        auctionItemId: Number(match[1]),
        ownerId: match[2],
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

async function buildPickerPayload({ ownerId, noticeEmbed = null }) {
    const items = await listOpenAuctionItemsForHiddenBids({ id: ownerId }, 250);
    const ownConfiguredCount = items.filter(item => item.user_hidden_max != null).length;
    const visibleItems = items.slice(0, MAX_OPTIONS);

    const embeds = [];
    if (noticeEmbed) {
        embeds.push(noticeEmbed);
    }

    const summaryLines = [
        'Select an open auction item and set your hidden max bid.',
        'Only you can see this interaction.',
        '',
        `Open items: **${items.length}**`,
        `Your hidden bids: **${ownConfiguredCount}**`,
    ];
    if (items.length > MAX_OPTIONS) {
        summaryLines.push(`Showing first **${MAX_OPTIONS}** items. Use \`/mg-hiddenbid\` after your auction advances.`);
    }

    embeds.push(buildInfoEmbed('Hidden bid dashboard', summaryLines.join('\n')));
    embeds.push(...buildHiddenBidEmbeds(items));

    const components = [];
    if (visibleItems.length > 0) {
        const select = new StringSelectMenuBuilder()
            .setCustomId(`${SELECT_ID_PREFIX}${ownerId}`)
            .setPlaceholder('Select item...')
            .addOptions(
                visibleItems.map(item => {
                    const summary = summarizeAuctionItem(item);
                    return new StringSelectMenuOptionBuilder()
                        .setLabel(summary.label)
                        .setDescription(summary.description)
                        .setValue(String(item.auction_item_id));
                }),
            );

        components.push(new ActionRowBuilder().addComponents(select));
    }

    components.push(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`${REFRESH_ID_PREFIX}${ownerId}`)
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

    if (interaction.user.id !== ownerId) {
        await interaction.reply({
            content: '',
            embeds: [buildErrorEmbed('Action denied', 'This hidden-bid panel is not yours.')],
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    const selectedValue = interaction.values?.[0] || '';
    const auctionItemId = Number(selectedValue);
    if (!Number.isFinite(auctionItemId) || auctionItemId <= 0) {
        await interaction.update({
            content: '',
            embeds: [buildErrorEmbed('Invalid item', 'Please select a valid auction item.')],
            components: [],
        });
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

    const currency = String(item.auction_currency || 'GP').trim() || 'GP';
    const modal = new ModalBuilder()
        .setCustomId(`${MODAL_ID_PREFIX}${item.auction_item_id}_${ownerId}`)
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

async function handleRefresh(interaction) {
    const ownerId = parseOwnerIdFromCustomId(interaction.customId, REFRESH_ID_PREFIX);
    if (!ownerId) return false;

    if (interaction.user.id !== ownerId) {
        await interaction.reply({
            content: '',
            embeds: [buildErrorEmbed('Action denied', 'This hidden-bid panel is not yours.')],
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    const payload = await buildPickerPayload({ ownerId });
    await interaction.update(payload);
    return true;
}

async function handleModal(interaction) {
    const parsed = parseModalCustomId(interaction.customId);
    if (!parsed) return false;

    if (interaction.user.id !== parsed.ownerId) {
        await interaction.reply({
            content: '',
            embeds: [buildErrorEmbed('Action denied', 'This hidden-bid modal is not yours.')],
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    const rawInput = String(interaction.fields.getTextInputValue('hiddenBidMaxAmount') || '').replace(/\s+/g, '');
    if (!/^[0-9]+$/.test(rawInput)) {
        const payload = await buildPickerPayload({
            ownerId: parsed.ownerId,
            noticeEmbed: buildErrorEmbed('Invalid amount', 'Please enter a whole number.'),
        });
        await updateManageMessage(interaction, payload);
        return true;
    }

    const result = await upsertHiddenBidForDiscord(buildIdentityFromInteraction(interaction), parsed.auctionItemId, Number(rawInput));
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
            noticeEmbed: buildErrorEmbed('Hidden bid rejected', message),
        });
        await updateManageMessage(interaction, payload);
        return true;
    }

    const actionText = result.previousMax == null ? 'created' : 'updated';
    const successEmbed = buildSuccessEmbed(
        'Hidden bid saved',
        `Your hidden max for **${result.itemName}** is now **${result.maxAmount} ${result.auctionCurrency}** (${actionText}).`,
    );
    const payload = await buildPickerPayload({
        ownerId: parsed.ownerId,
        noticeEmbed: successEmbed,
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
