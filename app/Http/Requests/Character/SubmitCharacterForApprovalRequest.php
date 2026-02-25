<?php

namespace App\Http\Requests\Character;

use App\Models\Character;
use Illuminate\Foundation\Http\FormRequest;

class SubmitCharacterForApprovalRequest extends FormRequest
{
    public function authorize(): bool
    {
        $character = $this->route('character');
        if (! $character instanceof Character) {
            return false;
        }

        $userId = $this->user()?->getAuthIdentifier();

        return $userId && $character->user_id === $userId;
    }

    public function rules(): array
    {
        return [
            'registration_note' => ['required', 'string', 'max:2000'],
        ];
    }
}
