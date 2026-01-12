<?php

namespace App\Http\Requests\Shop;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class UpdateShopItemSnapshotRequest extends FormRequest
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
        return [
            'name' => 'required|string|max:255',
            'url' => 'nullable|url|max:255',
            'cost' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:255',
            'rarity' => 'required|in:common,uncommon,rare,very_rare',
            'type' => 'required|in:item,consumable,spellscroll',
        ];
    }
}
