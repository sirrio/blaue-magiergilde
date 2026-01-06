<?php

namespace App\Http\Requests\Auction;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class UpdateAuctionRequest extends FormRequest
{
    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->input('voice_channel_id') === '') {
            $this->merge(['voice_channel_id' => null]);
        }
    }

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = Auth::user();

        return $user->is_admin;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['nullable', 'string', 'max:255'],
            'status' => ['required', 'string', 'in:open,closed,draft'],
            'currency' => ['required', 'string', 'max:16'],
            'voice_channel_id' => ['nullable', 'string', 'regex:/^[0-9]{5,}$/'],
        ];
    }
}
