<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class ApplyLegacyCharacterApprovalImportRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = Auth::user();

        return (bool) ($user?->is_admin);
    }

    public function rules(): array
    {
        return [
            'preview_token' => ['required', 'string', 'max:120'],
        ];
    }
}
