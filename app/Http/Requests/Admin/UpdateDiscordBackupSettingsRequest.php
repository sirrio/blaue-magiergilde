<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class UpdateDiscordBackupSettingsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = Auth::user();

        return $user && $user->is_admin;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'guilds' => ['required', 'array'],
            'guilds.*.guild_id' => ['required', 'string', 'regex:/^[0-9]{5,}$/', 'max:32'],
            'guilds.*.channel_ids' => ['nullable', 'array'],
            'guilds.*.channel_ids.*' => ['string', 'regex:/^[0-9]{5,}$/', 'max:32'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'guilds.required' => 'Guilds fehlen.',
            'guilds.array' => 'Guilds muessen als Liste gesendet werden.',
            'guilds.*.guild_id.required' => 'Guild-ID fehlt.',
            'guilds.*.guild_id.regex' => 'Guild-ID ist ungueltig.',
            'guilds.*.channel_ids.array' => 'Channel-IDs muessen als Liste gesendet werden.',
            'guilds.*.channel_ids.*.regex' => 'Channel-ID ist ungueltig.',
        ];
    }
}
