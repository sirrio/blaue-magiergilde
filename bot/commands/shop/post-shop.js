const {
    ChannelType,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} = require('discord.js');
const db = require('../../db');
const { commandName, isOwner } = require('../../commandConfig');

function missingPermissions(permissions, required) {
    return required.filter(perm => !permissions?.has(perm));
}

function formatPermissionList(perms) {
    const names = {
        ViewChannel: 'View Channel',
        SendMessages: 'Send Messages',
        SendMessagesInThreads: 'Send Messages in Threads',
        CreatePublicThreads: 'Create Public Threads',
        ManageThreads: 'Manage Threads',
    };
    return perms.map(p => `- ${names[p] || p}`).join('\n');
}

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
    if (!url) return String(name ?? '');
    return `[${name}](<${url}>)`;
}

function formatItemLine(row) {
    const itemLink = formatLink(row.name, row.url);
    const parts = [itemLink];

    if (row.spell_id) {
        const spellPrimaryUrl = row.spell_url || row.spell_legacy_url;
        const spellLink = formatLink(row.spell_name, spellPrimaryUrl);
        parts.push(spellLink);

        if (row.spell_legacy_url && row.spell_legacy_url !== spellPrimaryUrl) {
            parts.push(formatLink('Legacy', row.spell_legacy_url));
        }
    }

    const prefix = parts.join(' - ');
    const cost = row.cost ? `: ${row.cost}` : '';
    return `${prefix}${cost}`;
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

async function resolveDestination({ botMember, interaction, target, shop, threadNameOption }) {
    if (target.type === ChannelType.GuildText) {
        const perms = target.permissionsFor(botMember);
        const missing = missingPermissions(perms, [
            'ViewChannel',
            'SendMessages',
            'CreatePublicThreads',
            'SendMessagesInThreads',
        ]);
        if (missing.length > 0) {
            await interaction.editReply(
                `Fehlende Bot-Rechte im Channel ${target}:\n${formatPermissionList(missing)}`,
            );
            return null;
        }

        const dateForName = new Date(shop.created_at).toISOString().slice(0, 10);
        const defaultThreadName = `Shop #${String(shop.id).padStart(3, '0')} — ${dateForName}`;
        const threadName = (threadNameOption || defaultThreadName).slice(0, 100);

        return target.threads.create({
            name: threadName,
            autoArchiveDuration: 1440,
            type: ChannelType.PublicThread,
        });
    }

    const perms = target.permissionsFor(botMember);
    const missing = missingPermissions(perms, ['ViewChannel', 'SendMessagesInThreads']);
    if (missing.length > 0) {
        await interaction.editReply(
            `Fehlende Bot-Rechte im Thread ${target}:\n${formatPermissionList(missing)}` +
            '\nHinweis: Bei privaten Threads muss der Bot außerdem Mitglied des Threads sein.',
        );
        return null;
    }

    if (target.type === ChannelType.PrivateThread) {
        try {
            await target.members.fetch(botMember.id);
        } catch {
            await interaction.editReply(
                `Der Thread ${target} ist privat und der Bot ist kein Mitglied. ` +
                `Füge den Bot zum Thread hinzu oder wähle einen Text-Channel, damit der Bot den Thread selbst erstellt.`,
            );
            return null;
        }
    }

    if (target.locked) {
        await interaction.editReply(
            `Der Thread ${target} ist gesperrt (locked). Entsperre ihn oder gib dem Bot "Manage Threads".`,
        );
        return null;
    }

    return target;
}

async function sendOneLine(destination, line) {
    if (!line) return;
    await destination.send(String(line));
}

async function sendLines(destination, lines) {
    for (const line of lines) {
        // eslint-disable-next-line no-await-in-loop
        await sendOneLine(destination, line);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName(commandName('post-shop'))
        .setDescription('Postet einen Shop (Items) in einen Thread (oder erstellt einen Thread in einem Channel).')
        .addChannelOption(option =>
            option
                .setName('target')
                .setDescription('Text-Channel (Thread wird erstellt) oder ein existierender Thread.')
                .addChannelTypes(
                    ChannelType.GuildText,
                    ChannelType.PublicThread,
                    ChannelType.PrivateThread,
                    ChannelType.AnnouncementThread,
                )
                .setRequired(true),
        )
        .addStringOption(option =>
            option
                .setName('thread_name')
                .setDescription('Optional: Thread-Name (wenn target ein Text-Channel ist).')
                .setRequired(false),
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

        if (!isOwner(interaction.user.id) && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            await interaction.reply({
                content: 'Du hast keine Berechtigung, diesen Befehl zu verwenden (benötigt: Manage Server).',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const target = interaction.options.getChannel('target', true);
        const shopIdOption = interaction.options.getInteger('shop_id');
        const threadNameOption = interaction.options.getString('thread_name');

        try {
            const botMember = interaction.guild.members.me ?? await interaction.guild.members.fetchMe();

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

            const destination = await resolveDestination({ botMember, interaction, target, shop, threadNameOption });
            if (!destination) return;

            const createdAtUnix = Math.floor(new Date(shop.created_at).getTime() / 1000);
            const createdAtText = Number.isFinite(createdAtUnix) ? `<t:${createdAtUnix}:f>` : String(shop.created_at);
            await sendOneLine(destination, `**Shop #${String(shop.id).padStart(3, '0')}** — Rolled: ${createdAtText}`);

            const rarityOrder = ['common', 'uncommon', 'rare', 'very_rare'];
            const typeOrder = ['item', 'consumable', 'spellscroll'];
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

                for (const type of typeOrder) {
                    const rows = byType.get(type);
                    if (rows) rows.sort((a, b) => String(a.name).localeCompare(String(b.name)));
                }

                await sendOneLine(destination, `## ***⚔️ ${rarityLabel} Magic Items (${tierText}):***`);
                await sendLines(destination, (byType.get('item') ?? []).map(formatItemLine));

                const consumableLines = (byType.get('consumable') ?? []).map(formatItemLine);
                const scrollLines = (byType.get('spellscroll') ?? []).map(formatItemLine);

                if (rarity === 'common' || rarity === 'uncommon') {
                    await sendOneLine(destination, `### ${rarityLabel} Consumable`);
                    await sendLines(destination, consumableLines);

                    await sendOneLine(destination, `### ${rarityLabel} Spell Scroll`);
                    await sendLines(destination, scrollLines);
                } else {
                    await sendOneLine(destination, `### ${rarityLabel} Consumable/Spell Scroll`);
                    await sendLines(destination, [...consumableLines, ...scrollLines]);
                }
            }

            await interaction.editReply(
                destination.id === target.id
                    ? `Shop #${shop.id} wurde in ${destination} gepostet.`
                    : `Shop #${shop.id} wurde in Thread ${destination} (in ${target}) gepostet.`,
            );
        } catch (error) {
            console.error(error);
            const code = error?.code ?? error?.rawError?.code;
            if (code === 50001) {
                await interaction.editReply(
                    'Missing Access (50001): dem Bot fehlen Rechte im Channel/Thread oder er ist nicht im privaten Thread.',
                );
                return;
            }
            await interaction.editReply(`Fehler beim Posten des Shops: ${error.message}`);
        }
    },
};

