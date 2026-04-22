<?php

namespace App\Http\Controllers\Character;

use App\Actions\Character\SetQuickLevel;
use App\Http\Controllers\Controller;
use App\Http\Requests\Character\UpdateCharacterBubbleShopRequest;
use App\Models\Character;
use App\Support\CharacterBubbleShop;
use App\Support\CharacterProgressionState;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class CharacterBubbleShopController extends Controller
{
    public function __construct(
        private SetQuickLevel $setQuickLevel,
        private CharacterProgressionState $progressionState = new CharacterProgressionState,
    ) {}

    public function __invoke(
        UpdateCharacterBubbleShopRequest $request,
        Character $character,
        CharacterBubbleShop $bubbleShop,
    ): RedirectResponse {
        $requestedQuantities = [];
        foreach (CharacterBubbleShop::purchaseTypes() as $type) {
            $requestedQuantities[$type] = max(0, $request->integer($type));
        }

        $currentQuantities = $bubbleShop->quantitiesFor($character);
        $shouldCreateAnchor = (bool) $character->simplified_tracking
            && ! $this->progressionState->hasPseudoAdventures($character)
            && ! $character->is_filler
            && $requestedQuantities !== $currentQuantities;
        $currentLevel = $shouldCreateAnchor ? $this->progressionState->currentLevel($character) : null;
        $currentBubblesInLevel = $shouldCreateAnchor ? $this->progressionState->bubblesInCurrentLevel($character) : 0;

        DB::transaction(function () use ($request, $character, $bubbleShop, $shouldCreateAnchor, $currentLevel, $currentBubblesInLevel): void {
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
            $bubbleShop->syncEffectiveSpend($character);
            $character->save();
        });

        return back();
    }
}
