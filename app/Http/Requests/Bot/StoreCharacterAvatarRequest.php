<?php

namespace App\Http\Requests\Bot;

use Illuminate\Foundation\Http\FormRequest;

class StoreCharacterAvatarRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'character_id' => ['required', 'integer', 'exists:characters,id'],
            'avatar_url' => ['required', 'url', 'max:2048'],
        ];
    }
}
