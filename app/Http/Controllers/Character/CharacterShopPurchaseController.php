<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Http\Requests\Character\StoreCharacterShopPurchaseRequest;
use App\Models\Character;
use App\Models\CharacterShopPurchase;
use App\Support\BubbleShopSpendCalculator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class CharacterShopPurchaseController extends Controller
{
    private const TYPE_COSTS = [
        'skill_prof' => 6,
        'rare_language' => 4,
        'language' => 2,
        'tool' => 2,
    ];

    public function store(
        StoreCharacterShopPurchaseRequest $request,
        Character $character,
    ): RedirectResponse {
        $this->ensureCharacterOwner($character);

        $type = (string) $request->input('type');
        $cost = self::TYPE_COSTS[$type] ?? null;
        if ($cost === null) {
            throw ValidationException::withMessages([
                'type' => 'Unknown bubble shop purchase type.',
            ]);
        }

        $counts = CharacterShopPurchase::query()
            ->where('character_id', $character->id)
            ->selectRaw('type, COUNT(*) AS amount')
            ->groupBy('type')
            ->pluck('amount', 'type');

        $currentSkill = (int) ($counts['skill_prof'] ?? 0);
        $currentRare = (int) ($counts['rare_language'] ?? 0);
        $currentNormal = (int) ($counts['language'] ?? 0) + (int) ($counts['tool'] ?? 0);

        if ($type === 'skill_prof' && $currentSkill >= 1) {
            throw ValidationException::withMessages([
                'type' => 'You can only buy one skill proficiency.',
            ]);
        }

        if ($type === 'rare_language' && $currentRare >= 1) {
            throw ValidationException::withMessages([
                'type' => 'You can only buy one rare language.',
            ]);
        }

        if (in_array($type, ['language', 'tool'], true) && $currentNormal >= 3) {
            throw ValidationException::withMessages([
                'type' => 'You can only buy up to three tools or languages.',
            ]);
        }

        $availableBubbles = $this->calculateAvailableBubbles($character);
        $currentLevel = $this->calculateLevelFromBubbles($availableBubbles);

        if ($character->is_filler || $currentLevel < 5) {
            throw ValidationException::withMessages([
                'type' => 'Bubble Shop unlocks at level 5.',
            ]);
        }

        if ($availableBubbles < $cost) {
            throw ValidationException::withMessages([
                'type' => 'Not enough bubbles available for this purchase.',
            ]);
        }

        CharacterShopPurchase::query()->create([
            'character_id' => $character->id,
            'type' => $type,
            'cost' => $cost,
        ]);

        return redirect()->back();
    }

    public function destroy(
        Character $character,
        CharacterShopPurchase $purchase,
    ): RedirectResponse {
        $this->ensureCharacterOwner($character);

        if ($purchase->character_id !== $character->id) {
            abort(404);
        }

        $purchase->delete();

        return redirect()->back();
    }

    private function calculateAvailableBubbles(Character $character): int
    {
        $adventureBubbles = $character->adventures()
            ->whereNull('deleted_at')
            ->get()
            ->reduce(function (int $total, $adventure): int {
                $duration = $this->safeInt($adventure->duration);
                $bonus = $adventure->has_additional_bubble ? 1 : 0;

                return $total + (int) floor($duration / 10800) + $bonus;
            }, 0);

        $dmBubbles = $this->safeInt($character->dm_bubbles);
        $additionalBubbles = $this->additionalBubblesForStartTier($character->start_tier);
        $bubbleShopSpend = (new BubbleShopSpendCalculator)->total($character);

        return max(0, $adventureBubbles + $dmBubbles + $additionalBubbles - $bubbleShopSpend);
    }

    private function calculateLevelFromBubbles(int $availableBubbles): int
    {
        $effective = max(0, $availableBubbles);
        $level = (int) floor(1 + (sqrt(8 * $effective + 1) - 1) / 2);

        return min(20, max(1, $level));
    }

    private function additionalBubblesForStartTier(?string $startTier): int
    {
        return match (strtolower((string) $startTier)) {
            'lt' => 10,
            'ht' => 55,
            default => 0,
        };
    }

    private function safeInt(mixed $value): int
    {
        return is_numeric($value) ? (int) $value : 0;
    }

    private function ensureCharacterOwner(Character $character): void
    {
        $userId = Auth::user()?->getAuthIdentifier();
        if (! $userId || $character->user_id !== $userId) {
            abort(403);
        }
    }
}
