<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'privacy_policy_accepted' => ['accepted'],
        ];
    }

    public function messages(): array
    {
        return [
            'privacy_policy_accepted.accepted' => 'Bitte bestaetige die Datenschutzerklaerung.',
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => 'nickname',
        ];
    }
}
