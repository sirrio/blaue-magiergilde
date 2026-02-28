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
            'character_approval_channel_id' => ['nullable', 'string', 'regex:/^[0-9]{5,}$/', 'max:32'],
            'character_approval_channel_name' => ['nullable', 'string', 'max:255'],
            'character_approval_channel_guild_id' => ['nullable', 'string', 'regex:/^[0-9]{5,}$/', 'max:32'],
            'games_channel_id' => ['nullable', 'string', 'regex:/^[0-9]{5,}$/', 'max:32'],
            'games_channel_name' => ['nullable', 'string', 'max:255'],
            'games_channel_guild_id' => ['nullable', 'string', 'regex:/^[0-9]{5,}$/', 'max:32'],
            'games_scan_years' => ['nullable', 'integer', 'min:1', 'max:25'],
            'games_scan_interval_minutes' => ['nullable', 'integer', 'min:1', 'max:1440'],
            'support_ticket_channel_id' => ['nullable', 'string', 'regex:/^[0-9]{5,}$/', 'max:32'],
            'support_ticket_channel_name' => ['nullable', 'string', 'max:255'],
            'support_ticket_channel_guild_id' => ['nullable', 'string', 'regex:/^[0-9]{5,}$/', 'max:32'],
        ];
    }
}
