<?php

namespace App\Http\Requests\Character;

use App\Models\Character;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAvatarModeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();
        $character = $this->route('character');

        return $user !== null
            && $character instanceof Character
            && (int) $character->user_id === (int) $user->getAuthIdentifier();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'avatar_masked' => ['required', 'boolean'],
        ];
    }
}
