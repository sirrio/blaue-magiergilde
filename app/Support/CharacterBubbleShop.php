<?php

namespace App\Support;

use App\Models\Character;
use App\Models\CharacterBubbleShopPurchase;
use Illuminate\Support\Collection;

class CharacterBubbleShop
{
    public const TYPE_SKILL_PROFICIENCY = 'skill_proficiency';

    public const TYPE_RARE_LANGUAGE = 'rare_language';

    public const TYPE_TOOL_OR_LANGUAGE = 'tool_or_language';

    public const TYPE_LT_DOWNTIME = 'lt_downtime';

    public const TYPE_HT_DOWNTIME = 'ht_downtime';

    private const LT_DOWNTIME_MAX = 15;

    private const HT_DOWNTIME_MAX = 30;

    private const DOWNTIME_SECONDS_PER_PURCHASE = 28800;

    public function __construct(private readonly CharacterProgressionState $progressionState = new CharacterProgressionState) {}

    /**
     * @return list<string>
     */
    public static function purchaseTypes(): array
    {
        return [
            self::TYPE_SKILL_PROFICIENCY,
            self::TYPE_RARE_LANGUAGE,
            self::TYPE_TOOL_OR_LANGUAGE,
            self::TYPE_LT_DOWNTIME,
            self::TYPE_HT_DOWNTIME,
        ];
    }

    /**
     * @return array<string, array{cost:int,max:int}>
     */
    public function definitionsFor(Character $character): array
    {
        return [
            self::TYPE_SKILL_PROFICIENCY => ['cost' => 6, 'max' => 1],
            self::TYPE_RARE_LANGUAGE => ['cost' => 4, 'max' => 1],
            self::TYPE_TOOL_OR_LANGUAGE => ['cost' => 2, 'max' => 3],
            self::TYPE_LT_DOWNTIME => ['cost' => 1, 'max' => $this->ltDowntimeMaxFor($character)],
            self::TYPE_HT_DOWNTIME => ['cost' => 1, 'max' => $this->htDowntimeMaxFor($character)],
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
        $definitions = $this->definitionsFor($character);

        return collect($this->quantitiesFor($character))
            ->reduce(function (int $total, int $quantity, string $type) use ($definitions): int {
                return $total + ($quantity * ($definitions[$type]['cost'] ?? 0));
            }, 0);
    }

    public function legacySpend(Character $character): int
    {
        $legacy = $character->bubble_shop_legacy_spend;
        if ($legacy === null) {
            return max(0, $this->safeInt($character->bubble_shop_spend));
        }

        return max(0, $this->safeInt($legacy));
    }

    public function effectiveSpend(Character $character): int
    {
        return max($this->legacySpend($character), $this->structuredSpend($character));
    }

    public function coveredByLegacy(Character $character): int
    {
        return min($this->legacySpend($character), $this->structuredSpend($character));
    }

    public function additionalSpendBeyondLegacy(Character $character): int
    {
        return max(0, $this->structuredSpend($character) - $this->legacySpend($character));
    }

    public function extraDowntimeSeconds(Character $character): int
    {
        $quantities = $this->quantitiesFor($character);

        return (
            ($quantities[self::TYPE_LT_DOWNTIME] ?? 0)
            + ($quantities[self::TYPE_HT_DOWNTIME] ?? 0)
        ) * self::DOWNTIME_SECONDS_PER_PURCHASE;
    }

    public function syncEffectiveSpend(Character $character): Character
    {
        $character->bubble_shop_spend = $this->effectiveSpend($character);

        return $character;
    }

    public function syncLegacySpend(Character $character, int $spend): Character
    {
        $normalizedSpend = max(0, $spend);
        $character->bubble_shop_legacy_spend = max($this->legacySpend($character), $normalizedSpend);
        $character->bubble_shop_spend = max($normalizedSpend, $this->structuredSpend($character));

        return $character;
    }

    public function maxQuantity(Character $character, string $type): int
    {
        return $this->definitionsFor($character)[$type]['max'] ?? 0;
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

    private function ltDowntimeMaxFor(Character $character): int
    {
        return $this->highestUnlockedTierRank($character) >= 2 ? self::LT_DOWNTIME_MAX : 0;
    }

    private function htDowntimeMaxFor(Character $character): int
    {
        return $this->highestUnlockedTierRank($character) >= 3 ? self::HT_DOWNTIME_MAX : 0;
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
        return match ($this->currentLevel($character)) {
            1, 2, 3, 4 => 'bt',
            5, 6, 7, 8, 9, 10 => 'lt',
            11, 12, 13, 14, 15, 16 => 'ht',
            17, 18, 19, 20 => 'et',
            default => 'bt',
        };
    }

    private function currentLevel(Character $character): int
    {
        if ($character->is_filler) {
            return 3;
        }

        $progressionVersionId = $this->progressionState->progressionVersionId($character);
        $additionalBubbles = $this->progressionState->hasPseudoAdventures($character)
            ? 0
            : $this->additionalBubblesForStartTier($character->start_tier);
        $availableBubbles = max(
            0,
            $this->adventureBubbles($character)
            + $this->progressionState->dmBubblesForProgression($character)
            + $additionalBubbles
            - $this->progressionState->bubbleShopSpendForProgression($character),
        );

        return LevelProgression::levelFromAvailableBubbles($availableBubbles, $progressionVersionId);
    }

    private function adventureBubbles(Character $character): int
    {
        return $this->adventures($character)
            ->sortBy([['start_date', 'asc'], ['id', 'asc']])
            ->values()
            ->pipe(function (Collection $adventures): int {
                $lastPseudoIndex = $adventures->reverse()->search(
                    fn (mixed $adventure): bool => (bool) $adventure->is_pseudo,
                );

                if ($lastPseudoIndex === false) {
                    return $adventures->reduce(fn (int $sum, mixed $adventure): int => $sum + $this->realBubblesFor($adventure), 0);
                }

                $lastPseudo = $adventures->get($lastPseudoIndex);
                $progressionVersionId = is_numeric($lastPseudo?->progression_version_id) && (int) $lastPseudo->progression_version_id > 0
                    ? (int) $lastPseudo->progression_version_id
                    : LevelProgression::activeVersionId();
                $pseudoBubbles = $lastPseudo->target_bubbles !== null
                    ? $this->safeInt($lastPseudo->target_bubbles)
                    : LevelProgression::bubblesRequiredForLevel(
                        max(1, min(20, $this->safeInt($lastPseudo->target_level, 1))),
                        $progressionVersionId,
                    );

                return $pseudoBubbles + $adventures->slice($lastPseudoIndex + 1)
                    ->filter(fn (mixed $adventure): bool => ! $adventure->is_pseudo)
                    ->reduce(fn (int $sum, mixed $adventure): int => $sum + $this->realBubblesFor($adventure), 0);
            });
    }

    /**
     * @return Collection<int, mixed>
     */
    private function adventures(Character $character): Collection
    {
        if ($character->relationLoaded('adventures')) {
            return $character->adventures;
        }

        return $character->adventures()->get();
    }

    private function realBubblesFor(mixed $adventure): int
    {
        $duration = $this->safeInt($adventure->duration);

        return (int) floor($duration / 10800) + ($adventure->has_additional_bubble ? 1 : 0);
    }

    private function additionalBubblesForStartTier(?string $startTier): int
    {
        return match ($startTier) {
            'lt' => 10,
            'ht' => 55,
            default => 0,
        };
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
