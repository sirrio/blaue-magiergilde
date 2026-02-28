<?php

namespace App\Http\Requests\Ally;

use App\Models\Ally;
use App\Models\Character;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAllyRequest extends FormRequest
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

        $ally = $this->route('ally');
        if (! $ally instanceof Ally) {
            return false;
        }

        return Character::query()
            ->whereKey($ally->character_id)
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
