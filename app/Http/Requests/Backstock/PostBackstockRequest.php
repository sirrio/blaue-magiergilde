<?php

namespace App\Http\Requests\Backstock;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class PostBackstockRequest extends FormRequest
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
