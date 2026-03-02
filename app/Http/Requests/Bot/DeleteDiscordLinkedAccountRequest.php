<?php

namespace App\Http\Requests\Bot;

use Illuminate\Foundation\Http\FormRequest;

class DeleteDiscordLinkedAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'actor_discord_id' => ['required', 'string', 'regex:/^[0-9]{5,}$/'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'actor_discord_id.required' => 'A Discord user id is required.',
            'actor_discord_id.regex' => 'The Discord user id must be numeric.',
        ];
    }
}
