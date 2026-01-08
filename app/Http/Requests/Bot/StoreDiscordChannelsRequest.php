<?php

namespace App\Http\Requests\Bot;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreDiscordChannelsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'channels' => ['required', 'array'],
            'channels.*.id' => ['required', 'string', 'regex:/^[0-9]{5,}$/', 'max:32'],
            'channels.*.guild_id' => ['required', 'string', 'regex:/^[0-9]{5,}$/', 'max:32'],
            'channels.*.name' => ['required', 'string', 'max:255'],
            'channels.*.type' => ['required', 'string', 'max:32'],
            'channels.*.parent_id' => ['nullable', 'string', 'regex:/^[0-9]{5,}$/', 'max:32'],
            'channels.*.is_thread' => ['boolean'],
            'channels.*.last_message_id' => ['nullable', 'string', 'regex:/^[0-9]{5,}$/', 'max:32'],
        ];
    }

    /**
     * Get the validation messages for the defined validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'channels.required' => 'Channels fehlen.',
            'channels.array' => 'Channels muessen als Liste gesendet werden.',
            'channels.*.id.required' => 'Channel-ID fehlt.',
            'channels.*.id.regex' => 'Channel-ID ist ungueltig.',
            'channels.*.guild_id.required' => 'Guild-ID fehlt.',
            'channels.*.guild_id.regex' => 'Guild-ID ist ungueltig.',
            'channels.*.name.required' => 'Channel-Name fehlt.',
            'channels.*.type.required' => 'Channel-Typ fehlt.',
            'channels.*.parent_id.regex' => 'Parent-ID ist ungueltig.',
            'channels.*.last_message_id.regex' => 'Last-Message-ID ist ungueltig.',
        ];
    }
}
