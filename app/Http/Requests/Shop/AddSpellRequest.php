<?php
namespace App\Http\Requests\Shop;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class AddSpellRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = Auth::user();
        return $user->is_admin;
    }

    public function rules(): array
    {
        return [
            'spell_levels' => 'required|array',
            'spell_levels.*' => 'integer|min:0|max:9',
            'spell_schools' => 'sometimes|array',
            'spell_schools.*' => 'string|in:abjuration,conjuration,divination,enchantment,evocation,illusion,necromancy,transmutation',
        ];
    }
}
