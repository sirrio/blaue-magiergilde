const { calculateLevel, calculateTierFromLevel } = require('./characterTier');

const TYPE_SKILL_PROFICIENCY = 'skill_proficiency';
const TYPE_RARE_LANGUAGE = 'rare_language';
const TYPE_TOOL_OR_LANGUAGE = 'tool_or_language';
const TYPE_DOWNTIME = 'downtime';

const DOWNTIME_SECONDS_PER_PURCHASE = 8 * 60 * 60;

function safeInt(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.floor(number) : fallback;
}

function purchaseTypes() {
    return [
        TYPE_SKILL_PROFICIENCY,
        TYPE_RARE_LANGUAGE,
        TYPE_TOOL_OR_LANGUAGE,
        TYPE_DOWNTIME,
    ];
}

function tierRank(tier) {
    const normalized = String(tier || '').trim().toLowerCase();
    if (normalized === 'et') {
        return 4;
    }
    if (normalized === 'ht') {
        return 3;
    }
    if (normalized === 'lt') {
        return 2;
    }

    return 1;
}

function currentTier(character) {
    if (character?.is_filler) {
        return 'bt';
    }

    return String(calculateTierFromLevel(calculateLevel(character)) || 'bt').toLowerCase();
}

function highestUnlockedTierRank(character) {
    return Math.max(
        tierRank(character?.start_tier),
        tierRank(currentTier(character)),
    );
}

function definitionsForCharacter(character) {
    const unlockedTierRank = highestUnlockedTierRank(character);
    const currentDowntimeQuantity = safeInt(character?.bubble_shop_downtime);

    return {
        [TYPE_SKILL_PROFICIENCY]: { cost: 6, max: 1 },
        [TYPE_RARE_LANGUAGE]: { cost: 4, max: 1 },
        [TYPE_TOOL_OR_LANGUAGE]: { cost: 2, max: 3 },
        [TYPE_DOWNTIME]: {
            cost: 1,
            max: unlockedTierRank >= 4 ? null : (unlockedTierRank >= 3 ? Math.max(45, currentDowntimeQuantity) : (unlockedTierRank >= 2 ? Math.max(15, currentDowntimeQuantity) : currentDowntimeQuantity)),
        },
    };
}

function quantitiesForCharacter(character) {
    return {
        [TYPE_SKILL_PROFICIENCY]: safeInt(character?.bubble_shop_skill_proficiency),
        [TYPE_RARE_LANGUAGE]: safeInt(character?.bubble_shop_rare_language),
        [TYPE_TOOL_OR_LANGUAGE]: safeInt(character?.bubble_shop_tool_or_language),
        [TYPE_DOWNTIME]: safeInt(character?.bubble_shop_downtime),
    };
}

function structuredSpendForCharacter(character, quantities = quantitiesForCharacter(character)) {
    const definitions = definitionsForCharacter(character);

    return purchaseTypes().reduce((total, type) => {
        return total + (safeInt(quantities[type]) * safeInt(definitions[type]?.cost));
    }, 0);
}

function legacySpendForCharacter(character) {
    if (character?.bubble_shop_legacy_spend === null || character?.bubble_shop_legacy_spend === undefined) {
        return Math.max(0, safeInt(character?.bubble_shop_spend));
    }

    return Math.max(0, safeInt(character?.bubble_shop_legacy_spend));
}

function coveredByLegacyForCharacter(character, quantities = quantitiesForCharacter(character)) {
    return Math.min(
        legacySpendForCharacter(character),
        structuredSpendForCharacter(character, quantities),
    );
}

function effectiveSpendForCharacter(character, quantities = quantitiesForCharacter(character)) {
    return Math.max(
        legacySpendForCharacter(character),
        structuredSpendForCharacter(character, quantities),
    );
}

function additionalSpendBeyondLegacyForCharacter(character, quantities = quantitiesForCharacter(character)) {
    return Math.max(
        0,
        structuredSpendForCharacter(character, quantities) - legacySpendForCharacter(character),
    );
}

function extraDowntimeSecondsForCharacter(character, quantities = quantitiesForCharacter(character)) {
    return safeInt(quantities[TYPE_DOWNTIME]) * DOWNTIME_SECONDS_PER_PURCHASE;
}

module.exports = {
    TYPE_SKILL_PROFICIENCY,
    TYPE_RARE_LANGUAGE,
    TYPE_TOOL_OR_LANGUAGE,
    TYPE_DOWNTIME,
    purchaseTypes,
    definitionsForCharacter,
    quantitiesForCharacter,
    structuredSpendForCharacter,
    legacySpendForCharacter,
    coveredByLegacyForCharacter,
    effectiveSpendForCharacter,
    additionalSpendBeyondLegacyForCharacter,
    extraDowntimeSecondsForCharacter,
};
