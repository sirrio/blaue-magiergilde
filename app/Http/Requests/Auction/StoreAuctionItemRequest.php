<?php

namespace App\Http\Requests\Auction;

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
            'starting_bid' => ['required', 'integer', 'min:0'],
            'remaining_auctions' => ['required', 'integer', 'min:1'],
            'repair_current' => ['nullable', 'integer', 'min:0', 'required_with:repair_max'],
            'repair_max' => ['nullable', 'integer', 'min:0', 'required_with:repair_current', 'gte:repair_current'],
        ];
    }
}
