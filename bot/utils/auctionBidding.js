function normalizeItemRarity(value) {
    const rarity = String(value || '').trim().toLowerCase();
    if (rarity === 'uncommon' || rarity === 'rare' || rarity === 'very_rare' || rarity === 'legendary' || rarity === 'artifact' || rarity === 'unknown_rarity') {
        return rarity;
    }
    return 'common';
}

function normalizeItemType(value) {
    const type = String(value || '').trim().toLowerCase();
    if (type === 'consumable' || type === 'spellscroll') {
        return type;
    }
    return 'item';
}

function getBidStepForItem({ rarity, type }) {
    const normalizedRarity = normalizeItemRarity(rarity);
    const normalizedType = normalizeItemType(type);

    let baseStep = 10;
    if (normalizedRarity === 'uncommon') baseStep = 50;
    if (normalizedRarity === 'rare') baseStep = 100;
    if (normalizedRarity === 'very_rare') baseStep = 500;
    if (normalizedRarity === 'legendary') baseStep = 1000;
    if (normalizedRarity === 'artifact') baseStep = 5000;

    if (normalizedType === 'consumable' || normalizedType === 'spellscroll') {
        baseStep = Math.floor(baseStep / 2);
    }

    return Math.max(1, baseStep);
}

function getStartingBidFromRepair({ repairCurrent, step }) {
    const safeStep = Math.max(1, Number(step) || 1);
    const currentValue = Number.isFinite(Number(repairCurrent)) ? Number(repairCurrent) : 0;
    const halfRepair = Math.ceil(currentValue / 2);
    return Math.ceil(halfRepair / safeStep) * safeStep;
}

function getMinimumBid({ startingBid, highestBid, step }) {
    const safeStartingBid = Math.max(0, Number(startingBid) || 0);
    const safeHighestBid = Math.max(0, Number(highestBid) || 0);
    const safeStep = Math.max(1, Number(step) || 1);

    if (safeHighestBid > 0) {
        return Math.max(safeStartingBid, safeHighestBid + safeStep);
    }

    return safeStartingBid;
}

module.exports = {
    getBidStepForItem,
    getStartingBidFromRepair,
    getMinimumBid,
};
