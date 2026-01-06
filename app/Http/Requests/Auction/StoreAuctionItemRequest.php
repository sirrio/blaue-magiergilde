<?php

namespace App\Http\Requests\Auction;

use App\Models\Item;
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

    private function parseCostValue(?string $cost): ?int
    {
        if ($cost === null) {
            return null;
        }

        $digits = preg_replace('/[^0-9]/', '', $cost);

        if ($digits === '') {
            return null;
        }

        return (int) $digits;
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
            'repair_current' => [
                'nullable',
                'integer',
                'min:0',
                function (string $attribute, mixed $value, callable $fail): void {
                    if ($value === null || $value === '') {
                        return;
                    }

                    $itemId = $this->input('item_id');
                    if (!$itemId) {
                        return;
                    }

                    $item = Item::query()->select('cost')->find($itemId);
                    if (!$item) {
                        return;
                    }

                    $costValue = $this->parseCostValue($item->cost);
                    if ($costValue === null) {
                        return;
                    }

                    if ((int) $value > $costValue) {
                        $fail('Repariert darf nicht hoeher als die Kosten sein.');
                    }
                },
            ],
        ];
    }
}
