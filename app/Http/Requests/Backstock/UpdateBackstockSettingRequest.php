<?php

namespace App\Http\Requests\Backstock;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class UpdateBackstockSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = Auth::user();

        return (bool) ($user?->is_admin ?? false);
    }

    public function rules(): array
    {
        return [
            'post_channel_id' => ['nullable', 'string', 'regex:/^[0-9]{5,}$/'],
            'post_channel_name' => ['nullable', 'string', 'max:255'],
            'post_channel_type' => ['nullable', 'string', 'max:255'],
            'post_channel_guild_id' => ['nullable', 'string', 'regex:/^[0-9]{5,}$/'],
            'post_channel_is_thread' => ['nullable', 'boolean'],
        ];
    }
}
