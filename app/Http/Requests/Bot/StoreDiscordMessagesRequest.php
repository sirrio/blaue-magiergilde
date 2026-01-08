<?php

namespace App\Http\Requests\Bot;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreDiscordMessagesRequest extends FormRequest
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
            'channel_id' => ['required', 'string', 'regex:/^[0-9]{5,}$/', 'max:32'],
            'guild_id' => ['required', 'string', 'regex:/^[0-9]{5,}$/', 'max:32'],
            'messages' => ['required', 'array'],
            'messages.*.id' => ['required', 'string', 'regex:/^[0-9]{5,}$/', 'max:32'],
            'messages.*.author_id' => ['required', 'string', 'regex:/^[0-9]{5,}$/', 'max:32'],
            'messages.*.author_name' => ['required', 'string', 'max:255'],
            'messages.*.author_display_name' => ['nullable', 'string', 'max:255'],
            'messages.*.content' => ['nullable', 'string'],
            'messages.*.message_type' => ['nullable', 'integer', 'min:0'],
            'messages.*.is_pinned' => ['nullable', 'boolean'],
            'messages.*.sent_at' => ['nullable', 'date'],
            'messages.*.edited_at' => ['nullable', 'date'],
            'messages.*.payload' => ['nullable', 'array'],
            'messages.*.attachments' => ['nullable', 'array'],
            'messages.*.attachments.*.id' => ['required_with:messages.*.attachments', 'string', 'regex:/^[0-9]{5,}$/', 'max:32'],
            'messages.*.attachments.*.filename' => ['required_with:messages.*.attachments', 'string', 'max:255'],
            'messages.*.attachments.*.content_type' => ['nullable', 'string', 'max:255'],
            'messages.*.attachments.*.size' => ['nullable', 'integer', 'min:0'],
            'messages.*.attachments.*.url' => ['required_with:messages.*.attachments', 'url'],
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
            'channel_id.required' => 'Channel-ID fehlt.',
            'channel_id.regex' => 'Channel-ID ist ungueltig.',
            'guild_id.required' => 'Guild-ID fehlt.',
            'guild_id.regex' => 'Guild-ID ist ungueltig.',
            'messages.required' => 'Messages fehlen.',
            'messages.array' => 'Messages muessen als Liste gesendet werden.',
            'messages.*.id.required' => 'Message-ID fehlt.',
            'messages.*.id.regex' => 'Message-ID ist ungueltig.',
            'messages.*.author_id.required' => 'Author-ID fehlt.',
            'messages.*.author_id.regex' => 'Author-ID ist ungueltig.',
            'messages.*.author_name.required' => 'Author-Name fehlt.',
            'messages.*.attachments.*.id.required_with' => 'Attachment-ID fehlt.',
            'messages.*.attachments.*.id.regex' => 'Attachment-ID ist ungueltig.',
            'messages.*.attachments.*.filename.required_with' => 'Attachment-Dateiname fehlt.',
            'messages.*.attachments.*.url.required_with' => 'Attachment-URL fehlt.',
            'messages.*.attachments.*.url.url' => 'Attachment-URL ist ungueltig.',
        ];
    }
}
