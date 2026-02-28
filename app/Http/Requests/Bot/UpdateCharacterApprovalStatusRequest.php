<?php

namespace App\Http\Requests\Bot;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCharacterApprovalStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'character_id' => ['required', 'integer', 'exists:characters,id'],
            'status' => ['required', 'string', 'in:pending,approved,declined,needs_changes'],
            'actor_discord_id' => ['required', 'string', 'regex:/^[0-9]{5,}$/', 'max:32'],
            'review_note' => [
                'nullable',
                'string',
                'max:2000',
                Rule::requiredIf(fn () => in_array((string) $this->input('status'), ['declined', 'needs_changes'], true)),
            ],
        ];
    }
}
