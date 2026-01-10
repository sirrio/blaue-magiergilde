<?php

namespace App\Http\Requests\Auction;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class UpdateAuctionSettingRequest extends FormRequest
{
    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->input('post_channel_id') === '') {
            $this->merge([
                'post_channel_id' => null,
                'post_channel_name' => null,
                'post_channel_type' => null,
                'post_channel_guild_id' => null,
                'post_channel_is_thread' => null,
            ]);
        }

        if ($this->input('post_channel_is_thread') === '') {
            $this->merge(['post_channel_is_thread' => null]);
        }

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

    public function authorize(): bool
    {
        $user = Auth::user();

        return (bool) ($user?->is_admin ?? false);
    }

    public function rules(): array
    {
        return [
            'post_channel_id' => ['sometimes', 'nullable', 'string', 'regex:/^[0-9]{5,}$/'],
            'post_channel_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'post_channel_type' => ['sometimes', 'nullable', 'string', 'max:50'],
            'post_channel_guild_id' => ['sometimes', 'nullable', 'string', 'regex:/^[0-9]{5,}$/'],
            'post_channel_is_thread' => ['sometimes', 'nullable', 'boolean'],
            'voice_channel_id' => ['sometimes', 'nullable', 'string', 'regex:/^[0-9]{5,}$/'],
            'voice_channel_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'voice_channel_type' => ['sometimes', 'nullable', 'string', 'max:50'],
            'voice_channel_guild_id' => ['sometimes', 'nullable', 'string', 'regex:/^[0-9]{5,}$/'],
            'voice_channel_is_thread' => ['sometimes', 'nullable', 'boolean'],
        ];
    }
}
