<?php

namespace App\Http\Requests\Adventure;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @property mixed $notes
 * @property mixed $has_additional_bubble
 * @property mixed $start_date
 * @property mixed $duration
 * @property mixed $title
 * @property mixed $game_master;
 */
class UpdateAdventureRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array|string>
     */
    public function rules(): array
    {
        $adventure = $this->route('adventure');
        $characterId = $adventure?->character_id;

        return [
            'duration' => 'required|integer',
            'start_date' => 'required|date',
            'has_additional_bubble' => 'required|boolean',
            'notes' => 'nullable|string',
            'game_master' => 'nullable|string',
            'title' => 'nullable|string|max:255',
            'ally_ids' => 'nullable|array',
            'ally_ids.*' => [
                'integer',
                Rule::exists('allies', 'id')->where('character_id', $characterId),
            ],
        ];
    }
}
