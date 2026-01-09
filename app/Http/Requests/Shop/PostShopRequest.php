<?php

namespace App\Http\Requests\Shop;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class PostShopRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = Auth::user();

        return $user?->is_admin === true;
    }

    public function rules(): array
    {
        return [
            'channel_id' => ['required', 'string', 'regex:/^[0-9]{5,}$/'],
        ];
    }
}
