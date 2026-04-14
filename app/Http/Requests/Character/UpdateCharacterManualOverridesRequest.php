<?php

namespace App\Http\Requests\Character;

use App\Models\Character;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateCharacterManualOverridesRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $character = $this->route('character');
        if (! $character instanceof Character) {
            return false;
        }

        $userId = $this->user()?->getAuthIdentifier();

        return $userId && $character->user_id === $userId;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'manual_adventures_count_enabled' => 'sometimes|boolean',
            'manual_adventures_count' => 'nullable|required_if:manual_adventures_count_enabled,1|integer|min:0|max:1024',
            'manual_faction_rank_enabled' => 'sometimes|boolean',
            'manual_faction_rank' => 'nullable|required_if:manual_faction_rank_enabled,1|integer|min:0|max:5',
        ];
    }
}
