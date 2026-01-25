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
            'character_approval_channel_id' => ['nullable', 'string', 'regex:/^[0-9]{5,}$/', 'max:32'],
            'character_approval_channel_name' => ['nullable', 'string', 'max:255'],
            'character_approval_channel_guild_id' => ['nullable', 'string', 'regex:/^[0-9]{5,}$/', 'max:32'],
        ];
    }
}
