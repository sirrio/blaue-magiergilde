<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class AcceptPrivacyPolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'privacy_policy_accepted' => ['accepted'],
        ];
    }

    public function messages(): array
    {
        return [
            'privacy_policy_accepted.accepted' => 'Bitte bestaetige die Datenschutzerklaerung.',
        ];
    }
}
