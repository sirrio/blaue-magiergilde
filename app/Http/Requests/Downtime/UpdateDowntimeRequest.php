<?php

namespace App\Http\Requests\Downtime;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @property mixed $duration
 * @property mixed $start_date
 * @property mixed $notes
 * @property mixed $type
 */
class UpdateDowntimeRequest extends FormRequest
{
  /**
   * Determine if the user is authorized to make this request.
   */
  public function authorize(): bool
  {
    return true;
  }

  /**
   * Get the validation rules that apply to the request.
   *
   * @return array<string, ValidationRule|array|string>
   */
  public function rules(): array
  {
    return [
      'duration' => 'required|integer',
      'start_date' => 'required|date',
      'notes' => 'nullable|string',
    ];
  }
}
