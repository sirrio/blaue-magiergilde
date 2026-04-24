<?php

namespace App\Http\Resources;

use App\Support\CharacterProgressionSnapshotResolver;
use Illuminate\Http\Resources\Json\JsonResource;

class CharacterDownloadResource extends JsonResource
{
    public function toArray($request): array
    {
        $snapshot = app(CharacterProgressionSnapshotResolver::class)->snapshot($this->resource);

        return [
            'name' => $this->name,
            'faction' => $this->faction,
            'notes' => $this->notes,
            'is_filler' => $this->is_filler,
            'start_tier' => $this->start_tier,
            'version' => $this->version,
            'dm_bubbles' => (int) ($snapshot['dm_bubbles'] ?? 0),
            'dm_coins' => (int) ($snapshot['dm_coins'] ?? 0),
            'bubble_shop_spend' => (int) ($snapshot['bubble_shop_spend'] ?? 0),
            'external_link' => $this->external_link,
            'level' => (int) ($snapshot['level'] ?? 1),
            'available_bubbles' => (int) ($snapshot['available_bubbles'] ?? 0),
            'classes' => $this->whenLoaded('characterClasses')->pluck('name'),
            'bubble_shop_purchases' => $this->whenLoaded('bubbleShopPurchases')->mapWithKeys(fn ($purchase) => [
                $purchase->type => [
                    'quantity' => $purchase->quantity,
                    'details' => $purchase->details,
                ],
            ]),
            'allies' => $this->whenLoaded('allies')->map(fn ($ally) => [
                'name' => $ally->name,
                'rating' => $ally->rating,
            ]),
            'adventures' => $this->whenLoaded('adventures')->map(fn ($adv) => [
                'title' => $adv->title,
                'game_master' => $adv->game_master,
                'date' => optional($adv->start_date)->toDateString(),
                'duration' => $adv->duration,
                'notes' => $adv->notes,
                'bonus_bubble' => $adv->has_additional_bubble,
            ]),
            'downtimes' => $this->whenLoaded('downtimes')->map(fn ($down) => [
                'type' => $down->type,
                'date' => optional($down->start_date)->toDateString(),
                'duration' => $down->duration,
                'notes' => $down->notes,
            ]),
        ];
    }
}
