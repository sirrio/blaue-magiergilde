<?php

namespace App\Http\Requests\Auction;

use App\Models\Item;
use App\Support\ItemPricing;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class StoreAuctionItemRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = Auth::user();

        return $user->is_admin;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'item_id' => ['required', 'integer', 'exists:items,id'],
            'remaining_auctions' => ['required', 'integer', 'min:1'],
            'notes' => ['nullable', 'string', 'max:255'],
            'repair_current' => [
                'nullable',
                'integer',
                'min:0',
                function (string $attribute, mixed $value, callable $fail): void {
                    if ($value === null || $value === '') {
                        return;
                    }

                    $itemId = $this->input('item_id');
                    if (! $itemId) {
                        return;
                    }

                    $item = Item::query()->select(['rarity', 'type'])->find($itemId);
                    if (! $item) {
                        return;
                    }

                    $costValue = ItemPricing::baseCostGp($item->rarity, $item->type);
                    if ($costValue === null) {
                        return;
                    }

                    if ((int) $value > $costValue) {
                        $fail('Repair amount cannot exceed the item cost.');
                    }
                },
            ],
        ];
    }
}
