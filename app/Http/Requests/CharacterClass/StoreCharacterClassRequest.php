<?php

namespace App\Http\Requests\CharacterClass;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class StoreCharacterClassRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) Auth::user()?->is_admin;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'source_id' => 'nullable|integer|exists:sources,id',
            'guild_enabled' => 'boolean',
        ];
    }
}
