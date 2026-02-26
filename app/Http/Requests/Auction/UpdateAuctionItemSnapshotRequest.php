<?php

namespace App\Http\Requests\Auction;

use App\Models\AuctionItem;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class UpdateAuctionItemSnapshotRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = Auth::user();

        return $user && $user->is_admin;
    }

    /**
     * @return array<string, ValidationRule|array|string>
     */
    public function rules(): array
    {
        /** @var AuctionItem|null $auctionItem */
        $auctionItem = $this->route('auctionItem');

        return [
            'name' => 'required|string|max:255',
            'url' => 'nullable|url|max:255',
            'cost' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:255',
            'rarity' => 'required|in:common,uncommon,rare,very_rare,legendary,artifact,unknown_rarity',
            'type' => 'required|in:weapon,armor,item,consumable,spellscroll',
            'repair_current' => [
                'nullable',
                'integer',
                'min:0',
                function (string $attribute, mixed $value, callable $fail) use ($auctionItem): void {
                    if ($value === null || $value === '') {
                        return;
                    }

                    $inputRepairMax = $this->input('repair_max');
                    $effectiveRepairMax = $inputRepairMax === null || $inputRepairMax === ''
                        ? $auctionItem?->repair_max
                        : (int) $inputRepairMax;

                    if ($effectiveRepairMax !== null && (int) $value > (int) $effectiveRepairMax) {
                        $fail('Repair current cannot exceed repair max.');
                    }
                },
            ],
            'repair_max' => [
                'nullable',
                'integer',
                'min:0',
                function (string $attribute, mixed $value, callable $fail) use ($auctionItem): void {
                    if ($value === null || $value === '') {
                        return;
                    }

                    $inputRepairCurrent = $this->input('repair_current');
                    $currentRepair = $inputRepairCurrent === null || $inputRepairCurrent === ''
                        ? (int) ($auctionItem?->repair_current ?? 0)
                        : (int) $inputRepairCurrent;

                    if ((int) $value < $currentRepair) {
                        $fail('Repair max cannot be lower than current repair.');
                    }
                },
            ],
        ];
    }
}
