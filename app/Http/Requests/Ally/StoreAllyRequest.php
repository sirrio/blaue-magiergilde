<?php

namespace App\Http\Requests\Ally;

use App\Models\Character;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @property mixed $name
 * @property mixed $character_id
 * @property mixed $rating
 */
class StoreAllyRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $userId = $this->user()?->getAuthIdentifier();
        if (! $userId) {
            return false;
        }

        $characterId = $this->integer('character_id');
        if ($characterId <= 0) {
            return true;
        }

        return Character::query()
            ->whereKey($characterId)
            ->where('user_id', $userId)
            ->exists();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'character_id' => 'required|integer|exists:characters,id',
            'name' => 'required|string|max:255',
            'rating' => 'required|integer|min:1|max:5',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp',
            'notes' => 'nullable|string',
            'species' => 'nullable|string|max:255',
            'classes' => 'nullable|string|max:255',
            'linked_character_id' => 'nullable|integer|exists:characters,id',
        ];
    }
}
