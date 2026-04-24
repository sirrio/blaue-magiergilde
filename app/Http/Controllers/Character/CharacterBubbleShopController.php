<?php

namespace App\Http\Controllers\Character;

use App\Actions\Character\SetQuickLevel;
use App\Http\Controllers\Controller;
use App\Http\Requests\Character\UpdateCharacterBubbleShopRequest;
use App\Models\Character;
use App\Support\CharacterAuditTrail;
use App\Support\CharacterBubbleShop;
use App\Support\CharacterProgressionSnapshotResolver;
use App\Support\CharacterProgressionState;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class CharacterBubbleShopController extends Controller
{
    public function __construct(
        private SetQuickLevel $setQuickLevel,
        private CharacterProgressionState $progressionState = new CharacterProgressionState,
        private CharacterProgressionSnapshotResolver $progressionSnapshots = new CharacterProgressionSnapshotResolver,
    ) {}

    public function __invoke(
        UpdateCharacterBubbleShopRequest $request,
        Character $character,
        CharacterBubbleShop $bubbleShop,
        CharacterAuditTrail $auditTrail,
    ): RedirectResponse {
        $requestedQuantities = [];
        foreach (CharacterBubbleShop::purchaseTypes() as $type) {
            $requestedQuantities[$type] = max(0, $request->integer($type));
        }

        $currentQuantities = $bubbleShop->quantitiesFor($character);
        $shouldCreateAnchor = (bool) $character->simplified_tracking
            && ! $this->progressionState->hasLevelAnchor($character)
            && ! $character->is_filler
            && $requestedQuantities !== $currentQuantities;
        $currentSnapshot = $shouldCreateAnchor ? $this->progressionSnapshots->snapshot($character) : null;
        $currentLevel = $currentSnapshot !== null ? (int) $currentSnapshot['level'] : null;
        $currentBubblesInLevel = $currentSnapshot !== null ? (int) $currentSnapshot['bubbles_in_level'] : 0;

        $previousBubbleShopSpend = $bubbleShop->structuredSpend($character);
        $previousDowntimeSeconds = $bubbleShop->extraDowntimeSeconds($character);

        $newBubbleShopSpend = $previousBubbleShopSpend;
        $newDowntimeSeconds = $previousDowntimeSeconds;

        DB::transaction(function () use ($request, $character, $bubbleShop, $shouldCreateAnchor, $currentLevel, $currentBubblesInLevel, &$newBubbleShopSpend, &$newDowntimeSeconds): void {
            if ($shouldCreateAnchor && $currentLevel !== null) {
                $result = $this->setQuickLevel->handle(
                    $character->fresh(),
                    $currentLevel,
                    $currentBubblesInLevel,
                    true,
                );

                if (! $result['ok']) {
                    throw new RuntimeException('Unable to create a level-tracking anchor for the bubble shop update.');
                }
            }

            foreach (CharacterBubbleShop::purchaseTypes() as $type) {
                $quantity = max(0, $request->integer($type));

                if ($quantity === 0) {
                    $character->bubbleShopPurchases()->where('type', $type)->delete();

                    continue;
                }

                $character->bubbleShopPurchases()->updateOrCreate(
                    ['type' => $type],
                    ['quantity' => $quantity, 'details' => null],
                );
            }

            $character->load('bubbleShopPurchases');
            $newBubbleShopSpend = $bubbleShop->structuredSpend($character);
            $newDowntimeSeconds = $bubbleShop->extraDowntimeSeconds($character);
        });
        $auditTrail->record($character, 'bubble_shop.updated', delta: [
            'bubble_shop_spend' => $newBubbleShopSpend - $previousBubbleShopSpend,
            'bubbles' => $previousBubbleShopSpend - $newBubbleShopSpend,
            'downtime_seconds' => $newDowntimeSeconds - $previousDowntimeSeconds,
        ], metadata: [
            'previous_quantities' => $currentQuantities,
            'new_quantities' => $requestedQuantities,
            'created_level_anchor' => $shouldCreateAnchor,
        ]);

        return back();
    }
}
