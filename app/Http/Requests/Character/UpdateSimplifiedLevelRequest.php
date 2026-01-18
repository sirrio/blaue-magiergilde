<?php

namespace App\Http\Requests\Character;

use App\Models\Character;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSimplifiedLevelRequest extends FormRequest
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

        $user = $this->user();
        if (! $user || ! $user->simplified_tracking) {
            return false;
        }

        return $character->user_id === $user->getAuthIdentifier();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'simplified_level' => ['required', 'integer', 'min:1', 'max:20'],
        ];
    }

    /**
     * Get the validation messages for the defined rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'simplified_level.required' => 'A level is required.',
            'simplified_level.integer' => 'The level must be a whole number.',
            'simplified_level.min' => 'The level must be at least :min.',
            'simplified_level.max' => 'The level may not be greater than :max.',
        ];
    }
}
