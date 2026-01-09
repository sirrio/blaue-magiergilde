<?php

namespace App\Http\Requests\Shop;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class PostShopRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = Auth::user();

        return (bool) ($user?->is_admin ?? false);
    }

    public function rules(): array
    {
        return [
            'channel_id' => ['required', 'string', 'regex:/^[0-9]{5,}$/'],
        ];
    }
}
