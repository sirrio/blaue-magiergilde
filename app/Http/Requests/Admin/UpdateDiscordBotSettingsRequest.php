<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDiscordBotSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user && $user->is_admin;
    }

    public function rules(): array
    {
        return [
            'owner_ids' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
