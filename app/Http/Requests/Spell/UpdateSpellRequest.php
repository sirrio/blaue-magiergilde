<?php

namespace App\Http\Requests\Spell;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class UpdateSpellRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = Auth::user();

        return (bool) ($user?->is_admin);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'id' => 'required|numeric|exists:spells,id',
            'name' => 'required|string',
            'url' => 'nullable|url',
            'legacy_url' => 'nullable|url',
            'spell_school' => 'nullable|in:abjuration,conjuration,divination,enchantment,evocation,illusion,necromancy,transmutation',
            'spell_level' => 'required|integer|min:0|max:9',
            'source_id' => 'nullable|integer|exists:sources,id',
            'guild_enabled' => 'boolean',
            'ruling_changed' => 'boolean',
            'ruling_note' => 'nullable|string|max:500',
        ];
    }
}
