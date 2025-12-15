const {
    ChannelType,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} = require('discord.js');
const db = require('../../db');
const { commandName } = require('../../commandConfig');

function rarityDisplayName(rarity) {
    switch (rarity) {
        case 'very_rare':
            return 'Very Rare';
        case 'rare':
            return 'Rare';
        case 'uncommon':
            return 'Uncommon';
        case 'common':
        default:
            return 'Common';
    }
}

function tierRequirementForRarity(rarity) {
    switch (rarity) {
        case 'common':
        case 'uncommon':
            return 'Ab Low Tier';
        case 'rare':
            return 'Ab High Tier';
        case 'very_rare':
            return 'Ab Epic Tier';
        default:
            return '';
    }
}

function formatLink(name, url) {
    if (!url) return name;
    return `[${name}](<${url}>)`;
}

function formatItemLine(row) {
    const name = formatLink(row.name, row.url);
    const cost = row.cost ? `: ${row.cost}` : '';

    if (!row.spell_id) return `${name}${cost}`;

    const spellUrl = row.spell_url || row.spell_legacy_url;
    const spellName = formatLink(row.spell_name, spellUrl);
    const spellLevel = Number(row.spell_level);
    const spellLevelText = Number.isFinite(spellLevel) ? ` (L${spellLevel})` : '';
    return `${name}${cost} — Spell: ${spellName}${spellLevelText}`;
}

function buildSectionMessages(header, lines, maxMessageLength = 2000) {
    const sanitizedLines = lines.filter(Boolean);
    if (sanitizedLines.length === 0) return [];

    const messages = [];
    let currentLines = [];
    let currentHeader = header;

    const flush = () => {
        if (currentLines.length === 0) return;
        messages.push(`${currentHeader}\n${currentLines.join('\n')}`);
        currentLines = [];
        currentHeader = `${header} (cont.)`;
    };

    for (const line of sanitizedLines) {
        const candidateLines = [...currentLines, line];
        const candidate = `${currentHeader}\n${candidateLines.join('\n')}`;

        if (candidate.length > maxMessageLength) {
            flush();
            const single = `${currentHeader}\n${line}`;
            if (single.length > maxMessageLength) {
                messages.push(single.slice(0, maxMessageLength));
                currentHeader = `${header} (cont.)`;
                continue;
            }
            currentLines.push(line);
            continue;
        }

        currentLines.push(line);
    }

    flush();
    return messages;
}

async function fetchShop(shopId) {
    if (shopId) {
        const [rows] = await db.execute('SELECT id, created_at FROM shops WHERE id = ? LIMIT 1', [shopId]);
        return rows[0] ?? null;
    }

    const [rows] = await db.execute('SELECT id, created_at FROM shops ORDER BY created_at DESC LIMIT 1');
    return rows[0] ?? null;
}

async function fetchShopItems(shopId) {
    const [rows] = await db.execute(
        `
            SELECT
                si.id AS shop_item_id,
                i.id AS item_id,
                i.name,
                i.url,
                i.cost,
                i.rarity,
                i.type,
                s.id AS spell_id,
                s.name AS spell_name,
                s.url AS spell_url,
                s.legacy_url AS spell_legacy_url,
                s.spell_level
            FROM item_shop si
            INNER JOIN items i ON i.id = si.item_id
            LEFT JOIN spells s ON s.id = si.spell_id
            WHERE si.shop_id = ?
              AND i.deleted_at IS NULL
            ORDER BY i.name ASC
        `,
        [shopId],
    );

    return rows;
}

async function sendSection(targetChannel, header, lines) {
    const messages = buildSectionMessages(header, lines);
    for (const message of messages) {
        // eslint-disable-next-line no-await-in-loop
        await targetChannel.send(message);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName(commandName('post-shop'))
        .setDescription('Postet einen Shop (Items) in einen Channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Der Channel, in den der Shop gepostet werden soll.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true),
        )
        .addIntegerOption(option =>
            option
                .setName('shop_id')
                .setDescription('Optional: spezifische Shop-ID. Ohne Angabe wird der neueste Shop gepostet.')
                .setRequired(false)
                .setMinValue(1),
        ),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            await interaction.reply({
                content: 'Dieser Befehl kann nur in einem Server verwendet werden.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            await interaction.reply({
                content: 'Du hast keine Berechtigung, diesen Befehl zu verwenden (benötigt: Manage Server).',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const targetChannel = interaction.options.getChannel('channel', true);
        const shopIdOption = interaction.options.getInteger('shop_id');

        try {
            const shop = await fetchShop(shopIdOption);
            if (!shop) {
                await interaction.editReply(shopIdOption ? `Shop #${shopIdOption} nicht gefunden.` : 'Kein Shop gefunden.');
                return;
            }

            const items = await fetchShopItems(shop.id);
            if (items.length === 0) {
                await interaction.editReply(`Shop #${shop.id} hat keine Items.`);
                return;
            }

            const createdAtUnix = Math.floor(new Date(shop.created_at).getTime() / 1000);
            const createdAtText = Number.isFinite(createdAtUnix) ? `<t:${createdAtUnix}:f>` : String(shop.created_at);
            await targetChannel.send(`**Shop #${String(shop.id).padStart(3, '0')}** — Rolled: ${createdAtText}`);

            const rarityOrder = ['common', 'uncommon', 'rare', 'very_rare'];
            const grouped = new Map();

            for (const row of items) {
                const rarity = row.rarity ?? 'common';
                const type = row.type ?? 'item';
                if (!grouped.has(rarity)) grouped.set(rarity, new Map());
                const byType = grouped.get(rarity);
                if (!byType.has(type)) byType.set(type, []);
                byType.get(type).push(row);
            }

            for (const rarity of rarityOrder) {
                const byType = grouped.get(rarity);
                if (!byType) continue;

                const rarityLabel = rarityDisplayName(rarity);
                const tierText = tierRequirementForRarity(rarity);
                const heading = `## ***⚔️ ${rarityLabel} Magic Items (${tierText}):***`;

                const magicItemLines = (byType.get('item') ?? []).map(formatItemLine);
                await sendSection(targetChannel, heading, magicItemLines);

                const consumableLines = (byType.get('consumable') ?? []).map(formatItemLine);
                const scrollLines = (byType.get('spellscroll') ?? []).map(formatItemLine);

                if (rarity === 'common' || rarity === 'uncommon') {
                    await sendSection(targetChannel, `### ${rarityLabel} Consumable`, consumableLines);
                    await sendSection(targetChannel, `### ${rarityLabel} Spell Scroll`, scrollLines);
                } else {
                    await sendSection(targetChannel, `### ${rarityLabel} Consumable/Spell Scroll`, [...consumableLines, ...scrollLines]);
                }
            }

            await interaction.editReply(`Shop #${shop.id} wurde in ${targetChannel} gepostet.`);
        } catch (error) {
            console.error(error);
            await interaction.editReply(`Fehler beim Posten des Shops: ${error.message}`);
        }
    },
};

