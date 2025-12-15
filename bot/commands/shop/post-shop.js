const {
    ChannelType,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} = require('discord.js');
const db = require('../../db');
const { commandName } = require('../../commandConfig');

function splitLinesIntoChunks(lines, maxLength) {
    const chunks = [];
    let currentChunk = '';

    for (const line of lines) {
        const candidate = currentChunk.length === 0 ? line : `${currentChunk}\n${line}`;
        if (candidate.length > maxLength) {
            if (currentChunk.length > 0) {
                chunks.push(currentChunk);
                currentChunk = line;
                continue;
            }

            chunks.push(line.slice(0, maxLength));
            currentChunk = '';
            continue;
        }

        currentChunk = candidate;
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }

    return chunks;
}

function titleCase(snakeCase) {
    return snakeCase
        .split('_')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function formatItemLine(row) {
    const name = row.url ? `[${row.name}](${row.url})` : `**${row.name}**`;
    const cost = row.cost ? ` — ${row.cost}` : '';
    const type = row.type ? ` (${row.type})` : '';

    let spell = '';
    if (row.spell_id) {
        const spellUrl = row.spell_url || row.spell_legacy_url;
        const spellName = spellUrl ? `[${row.spell_name}](${spellUrl})` : row.spell_name;
        const spellLevel = Number(row.spell_level);
        const spellLevelText = Number.isFinite(spellLevel) ? ` (L${spellLevel})` : '';
        spell = ` — Spell: ${spellName}${spellLevelText}`;
    }

    return `• ${name}${cost}${type}${spell}`;
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
            ORDER BY
                FIELD(i.rarity, 'very_rare', 'rare', 'uncommon', 'common'),
                FIELD(i.type, 'item', 'consumable', 'spellscroll'),
                i.name ASC
        `,
        [shopId],
    );

    return rows;
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

            const rarityOrder = ['very_rare', 'rare', 'uncommon', 'common'];
            const byRarity = new Map(rarityOrder.map(r => [r, []]));

            for (const row of items) {
                const rarity = row.rarity ?? 'common';
                if (!byRarity.has(rarity)) {
                    byRarity.set(rarity, []);
                }
                byRarity.get(rarity).push(formatItemLine(row));
            }

            const fields = [];
            for (const rarity of rarityOrder) {
                const lines = byRarity.get(rarity) ?? [];
                if (lines.length === 0) continue;

                const chunks = splitLinesIntoChunks(lines, 1024);
                for (let i = 0; i < chunks.length; i++) {
                    fields.push({
                        name: i === 0 ? titleCase(rarity) : `${titleCase(rarity)} (cont.)`,
                        value: chunks[i],
                    });
                }
            }

            const createdAtUnix = Math.floor(new Date(shop.created_at).getTime() / 1000);
            const createdAtText = Number.isFinite(createdAtUnix) ? `<t:${createdAtUnix}:f>` : String(shop.created_at);

            const embed = new EmbedBuilder()
                .setTitle(`Shop #${String(shop.id).padStart(3, '0')}`)
                .setDescription(`Rolled: ${createdAtText}`)
                .addFields(fields);

            await targetChannel.send({ embeds: [embed] });

            await interaction.editReply(`Shop #${shop.id} wurde in ${targetChannel} gepostet.`);
        } catch (error) {
            console.error(error);
            await interaction.editReply(`Fehler beim Posten des Shops: ${error.message}`);
        }
    },
};
