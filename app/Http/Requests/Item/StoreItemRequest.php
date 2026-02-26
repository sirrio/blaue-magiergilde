<?php

namespace App\Http\Requests\Item;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

/**
 * @property mixed $name
 * @property mixed $url
 * @property mixed $cost
 * @property mixed $rarity
 * @property mixed $type
 */
class StoreItemRequest extends FormRequest
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
            'name' => 'required|string',
            'url' => 'url',
            'rarity' => 'required|string',
            'type' => 'required|in:weapon,armor,item,consumable,spellscroll',
            'source_id' => 'nullable|integer|exists:sources,id',
            'mundane_variant_ids' => 'nullable|array',
            'mundane_variant_ids.*' => 'integer|exists:mundane_item_variants,id',
            'shop_enabled' => 'boolean',
            'guild_enabled' => 'boolean',
            'default_spell_roll_enabled' => 'boolean',
            'default_spell_levels' => 'nullable|array',
            'default_spell_levels.*' => 'integer|min:0|max:9',
            'default_spell_schools' => 'nullable|array',
            'default_spell_schools.*' => 'in:abjuration,conjuration,divination,enchantment,evocation,illusion,necromancy,transmutation',
            'ruling_changed' => 'boolean',
            'ruling_note' => 'nullable|string|max:500',
        ];
    }
}
