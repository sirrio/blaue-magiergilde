<?php

namespace App\Http\Requests\Shop;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class UpdateShopSettingRequest extends FormRequest
{
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

        if ($this->input('auto_post_time') === '') {
            $this->merge([
                'auto_post_time' => null,
            ]);
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
            'auto_post_enabled' => ['sometimes', 'boolean'],
            'auto_post_weekday' => ['sometimes', 'integer', 'between:0,6'],
            'auto_post_time' => ['sometimes', 'nullable', 'date_format:H:i'],
        ];
    }
}
