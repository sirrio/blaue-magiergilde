<?php

namespace App\Http\Requests\Settings;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],

            'email' => [
                Rule::requiredIf(blank($this->user()?->discord_id)),
                'nullable',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($this->user()->id),
            ],
            'locale' => ['nullable', Rule::in(['de', 'en'])],
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => 'nickname',
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'An email address is required unless your account is connected to Discord.',
        ];
    }
}
