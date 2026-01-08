<?php

namespace App\Http\Requests\Bot;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreDiscordAttachmentRequest extends FormRequest
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
            'discord_message_id' => ['required', 'string', 'regex:/^[0-9]{5,}$/', 'max:32'],
            'attachment_id' => ['required', 'string', 'regex:/^[0-9]{5,}$/', 'max:32'],
            'filename' => ['required', 'string', 'max:255'],
            'content_type' => ['nullable', 'string', 'max:255'],
            'size' => ['nullable', 'integer', 'min:0'],
            'url' => ['required', 'url'],
            'file' => ['required', 'file'],
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
            'discord_message_id.required' => 'Message-ID fehlt.',
            'discord_message_id.regex' => 'Message-ID ist ungueltig.',
            'attachment_id.required' => 'Attachment-ID fehlt.',
            'attachment_id.regex' => 'Attachment-ID ist ungueltig.',
            'filename.required' => 'Dateiname fehlt.',
            'url.required' => 'Attachment-URL fehlt.',
            'url.url' => 'Attachment-URL ist ungueltig.',
            'file.required' => 'Attachment-Datei fehlt.',
        ];
    }
}
