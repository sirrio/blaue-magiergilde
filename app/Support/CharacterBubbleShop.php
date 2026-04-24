<?php

namespace App\Support;

use App\Models\Character;
use App\Models\CharacterBubbleShopPurchase;
use Illuminate\Database\Eloquent\Collection;

class CharacterBubbleShop
{
    public const TYPE_SKILL_PROFICIENCY = 'skill_proficiency';

    public const TYPE_RARE_LANGUAGE = 'rare_language';

    public const TYPE_TOOL_OR_LANGUAGE = 'tool_or_language';

    public const TYPE_DOWNTIME = 'downtime';

    private const LT_DOWNTIME_MAX = 15;

    private const HT_DOWNTIME_MAX = 45;

    private const DOWNTIME_SECONDS_PER_PURCHASE = 28800;

    public function __construct(
        private readonly CharacterProgressionState $progressionState = new CharacterProgressionState,
        private readonly CharacterProgressionSnapshotResolver $progressionSnapshots = new CharacterProgressionSnapshotResolver,
    ) {}

    /**
     * @return list<string>
     */
    public static function purchaseTypes(): array
    {
        return [
            self::TYPE_SKILL_PROFICIENCY,
            self::TYPE_RARE_LANGUAGE,
            self::TYPE_TOOL_OR_LANGUAGE,
            self::TYPE_DOWNTIME,
        ];
    }

    /**
     * @return array<string, array{cost:int,max:int|null}>
     */
    public function definitionsFor(Character $character): array
    {
        $quantities = $this->quantitiesFor($character);

        return [
            self::TYPE_SKILL_PROFICIENCY => ['cost' => $this->costFor(self::TYPE_SKILL_PROFICIENCY), 'max' => 1],
            self::TYPE_RARE_LANGUAGE => ['cost' => $this->costFor(self::TYPE_RARE_LANGUAGE), 'max' => 1],
            self::TYPE_TOOL_OR_LANGUAGE => ['cost' => $this->costFor(self::TYPE_TOOL_OR_LANGUAGE), 'max' => 3],
            self::TYPE_DOWNTIME => ['cost' => $this->costFor(self::TYPE_DOWNTIME), 'max' => $this->downtimeMaxFor($character, $quantities[self::TYPE_DOWNTIME] ?? 0)],
        ];
    }

    /**
     * @return array<string, int>
     */
    public function quantitiesFor(Character $character): array
    {
        $quantities = array_fill_keys(self::purchaseTypes(), 0);

        foreach ($this->purchases($character) as $purchase) {
            if (! isset($quantities[$purchase->type])) {
                continue;
            }

            $quantities[$purchase->type] = max(0, $this->safeInt($purchase->quantity));
        }

        return $quantities;
    }

    public function structuredSpend(Character $character): int
    {
        return $this->structuredSpendForQuantities($character, $this->quantitiesFor($character));
    }

    /**
     * @param  array<string, int>  $quantities
     */
    public function structuredSpendForQuantities(Character $character, array $quantities): int
    {
        return collect(self::purchaseTypes())
            ->reduce(function (int $total, string $type) use ($quantities): int {
                return $total + (max(0, $this->safeInt($quantities[$type] ?? 0)) * $this->costFor($type));
            }, 0);
    }

    public function extraDowntimeSeconds(Character $character): int
    {
        $quantities = $this->quantitiesFor($character);

        return ($quantities[self::TYPE_DOWNTIME] ?? 0) * self::DOWNTIME_SECONDS_PER_PURCHASE;
    }

    public function syncDowntimeSpendTarget(Character $character, int $targetSpend): Character
    {
        $normalizedTargetSpend = max(0, $targetSpend);
        $quantities = $this->quantitiesFor($character);
        $currentDowntimeQuantity = max(0, $this->safeInt($quantities[self::TYPE_DOWNTIME] ?? 0));
        $nonDowntimeSpend = $this->structuredSpend($character) - $currentDowntimeQuantity;
        $requiredDowntimeQuantity = max($currentDowntimeQuantity, max(0, $normalizedTargetSpend - $nonDowntimeSpend));

        if ($requiredDowntimeQuantity === 0) {
            $character->bubbleShopPurchases()->where('type', self::TYPE_DOWNTIME)->delete();
        } else {
            $character->bubbleShopPurchases()->updateOrCreate(
                ['type' => self::TYPE_DOWNTIME],
                ['quantity' => $requiredDowntimeQuantity, 'details' => null],
            );
        }

        $character->unsetRelation('bubbleShopPurchases');
        $character->load('bubbleShopPurchases');

        return $character;
    }

    public function maxQuantity(Character $character, string $type): ?int
    {
        $definitions = $this->definitionsFor($character);

        if (! array_key_exists($type, $definitions)) {
            return 0;
        }

        return $definitions[$type]['max'];
    }

    public function maxEffectiveSpendWithoutDownlevel(Character $character): ?int
    {
        if (! $this->progressionState->countsBubbleAdjustments($character)) {
            return null;
        }

        return $this->structuredSpend($character) + $this->currentBubblesInCurrentLevel($character);
    }

    /**
     * @return Collection<int, CharacterBubbleShopPurchase>
     */
    private function purchases(Character $character): Collection
    {
        if ($character->relationLoaded('bubbleShopPurchases')) {
            return $character->bubbleShopPurchases;
        }

        return $character->bubbleShopPurchases()->get();
    }

    private function downtimeMaxFor(Character $character, int $currentQuantity = 0): ?int
    {
        $unlockedMax = match ($this->highestUnlockedTierRank($character)) {
            4 => null,
            3 => self::HT_DOWNTIME_MAX,
            2 => self::LT_DOWNTIME_MAX,
            default => 0,
        };

        if ($unlockedMax === null) {
            return null;
        }

        return max($unlockedMax, max(0, $currentQuantity));
    }

    private function costFor(string $type): int
    {
        return match ($type) {
            self::TYPE_SKILL_PROFICIENCY => 6,
            self::TYPE_RARE_LANGUAGE => 4,
            self::TYPE_TOOL_OR_LANGUAGE => 2,
            self::TYPE_DOWNTIME => 1,
            default => 0,
        };
    }

    private function highestUnlockedTierRank(Character $character): int
    {
        return max(
            $this->tierRank($character->start_tier),
            $this->tierRank($this->currentTier($character)),
        );
    }

    private function currentTier(Character $character): string
    {
        return strtolower((string) $this->progressionSnapshots->snapshot($character)['tier']);
    }

    private function currentBubblesInCurrentLevel(Character $character): int
    {
        return max(0, (int) $this->progressionSnapshots->snapshot($character)['bubbles_in_level']);
    }

    private function tierRank(?string $tier): int
    {
        return match ($tier) {
            'lt' => 2,
            'ht' => 3,
            'et' => 4,
            default => 1,
        };
    }

    private function safeInt(mixed $value, int $fallback = 0): int
    {
        return is_numeric($value) ? (int) $value : $fallback;
    }
}
