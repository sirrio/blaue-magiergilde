<?php

namespace App\Http\Requests\Character;

use App\Models\Character;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePrivateModeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $character = $this->route('character');

        return $user !== null
            && $character instanceof Character
            && (int) $character->user_id === (int) $user->getAuthIdentifier();
    }

    public function rules(): array
    {
        return ['private_mode' => ['required', 'boolean']];
    }
}
