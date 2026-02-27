<?php

namespace App\Http\Requests\Item;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Validator;

/**
 * @property mixed $name
 * @property mixed $url
 * @property mixed $cost
 * @property mixed $rarity
 * @property mixed $type
 */
class UpdateItemRequest extends FormRequest
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
            'id' => 'required|numeric|exists:items,id',
            'name' => 'required|string',
            'url' => 'url',
            'rarity' => 'required|string',
            'type' => 'required|in:weapon,armor,item,consumable,spellscroll',
            'source_id' => 'nullable|integer|exists:sources,id',
            'mundane_variant_ids' => 'nullable|array',
            'mundane_variant_ids.*' => 'integer|exists:mundane_item_variants,id',
            'extra_cost_note' => 'nullable|string|max:255',
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

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $type = (string) $this->input('type', '');
            $variantIds = collect((array) $this->input('mundane_variant_ids', []))
                ->map(static fn ($value) => is_numeric($value) ? (int) $value : null)
                ->filter(static fn ($value) => $value !== null && $value > 0)
                ->unique()
                ->values();
            $extraCostNote = trim((string) $this->input('extra_cost_note', ''));

            if (in_array($type, ['weapon', 'armor'], true)) {
                if ($extraCostNote !== '') {
                    $validator->errors()->add('extra_cost_note', 'Extra cost note is only allowed for item, consumable, or spell scroll.');
                }

                if ($variantIds->isEmpty()) {
                    return;
                }

                $selectedVariants = DB::table('mundane_item_variants')
                    ->whereIn('id', $variantIds->all())
                    ->get(['id', 'category', 'is_placeholder']);

                $invalidCount = $selectedVariants
                    ->where('category', '!=', $type)
                    ->count();

                if ($invalidCount > 0) {
                    $validator->errors()->add('mundane_variant_ids', "Only {$type} variants can be attached to {$type} items.");
                }

                $hasAnyOption = $selectedVariants->contains(static fn ($variant): bool => (bool) $variant->is_placeholder);
                if ($hasAnyOption && $variantIds->count() > 1) {
                    $label = ucfirst($type);
                    $validator->errors()->add('mundane_variant_ids', "The Any {$label} option cannot be combined with specific {$type} variants.");
                }

                return;
            }

            if (! in_array($type, ['item', 'consumable', 'spellscroll'], true)) {
                return;
            }

            if ($variantIds->isNotEmpty()) {
                $validator->errors()->add('mundane_variant_ids', 'Mundane variants are only allowed for weapon or armor items.');
            }
        });
    }
}
