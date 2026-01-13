<?php

namespace App\Http\Requests\Adventure;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @property int $duration
 * @property int $character_id
 * @property mixed $start_date
 * @property mixed $has_additional_bubble
 * @property mixed $notes
 * @property mixed $title
 * @property mixed $game_master
 */
class StoreAdventureRequest extends FormRequest
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
        $characterId = $this->input('character_id');

        return [
            'duration' => 'required|integer|min:0',
            'character_id' => 'required|integer',
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
