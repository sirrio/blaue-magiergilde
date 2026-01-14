<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class CharacterDownloadResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'name' => $this->name,
            'faction' => $this->faction,
            'notes' => $this->notes,
            'is_filler' => $this->is_filler,
            'start_tier' => $this->start_tier,
            'version' => $this->version,
            'dm_bubbles' => $this->dm_bubbles,
            'dm_coins' => $this->dm_coins,
            'bubble_shop_spend' => $this->bubble_shop_spend,
            'external_link' => $this->external_link,
            'classes' => $this->whenLoaded('characterClasses')->pluck('name'),
            'allies' => $this->whenLoaded('allies')->map(fn($ally) => [
                'name' => $ally->name,
                'rating' => $ally->rating,
            ]),
            'adventures' => $this->whenLoaded('adventures')->map(fn($adv) => [
                'title' => $adv->title,
                'game_master' => $adv->game_master,
                'date' => optional($adv->start_date)->toDateString(),
                'duration' => $adv->duration,
                'notes' => $adv->notes,
                'bonus_bubble' => $adv->has_additional_bubble,
            ]),
            'downtimes' => $this->whenLoaded('downtimes')->map(fn($down) => [
                'type' => $down->type,
                'date' => optional($down->start_date)->toDateString(),
                'duration' => $down->duration,
                'notes' => $down->notes,
            ]),
        ];
    }
}
