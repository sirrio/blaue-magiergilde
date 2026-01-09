<?php

namespace App\Http\Requests\Shop;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class UpdateShopSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = Auth::user();

        return (bool) ($user?->is_admin ?? false);
    }

    public function rules(): array
    {
        return [
            'post_channel_id' => ['required', 'string', 'regex:/^[0-9]{5,}$/'],
            'post_channel_name' => ['required', 'string', 'max:255'],
            'post_channel_type' => ['required', 'string', 'max:50'],
            'post_channel_guild_id' => ['required', 'string', 'regex:/^[0-9]{5,}$/'],
            'post_channel_is_thread' => ['required', 'boolean'],
        ];
    }
}
