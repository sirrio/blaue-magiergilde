<?php

namespace App\Http\Requests\Auction;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class UpdateVoiceSettingRequest extends FormRequest
{
    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->input('voice_channel_id') === '') {
            $this->merge([
                'voice_channel_id' => null,
                'voice_channel_name' => null,
                'voice_channel_type' => null,
                'voice_channel_guild_id' => null,
                'voice_channel_is_thread' => null,
            ]);
        }

        if ($this->input('voice_channel_is_thread') === '') {
            $this->merge(['voice_channel_is_thread' => null]);
        }
    }

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = Auth::user();

        return $user->is_admin;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'voice_channel_id' => ['nullable', 'string', 'regex:/^[0-9]{5,}$/'],
            'voice_channel_name' => ['nullable', 'string', 'max:150'],
            'voice_channel_type' => ['nullable', 'string', 'max:50'],
            'voice_channel_guild_id' => ['nullable', 'string', 'regex:/^[0-9]{5,}$/'],
            'voice_channel_is_thread' => ['nullable', 'boolean'],
        ];
    }
}
