<?php

namespace App\Http\Requests\Auction;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class StoreAuctionHiddenBidRequest extends FormRequest
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
            'bidder_name' => ['required', 'string', 'max:255'],
            'bidder_discord_id' => ['required', 'string', 'regex:/^[0-9]{5,}$/', 'max:32'],
            'max_amount' => ['required', 'integer', 'min:1'],
        ];
    }
}
