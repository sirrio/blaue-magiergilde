<?php

namespace App\Http\Requests\Game;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @property mixed $duration
 * @property mixed $title
 * @property mixed $start_date
 * @property mixed $has_additional_bubble
 * @property mixed $sessions
 * @property mixed $tier
 * @property mixed $notes
 */
class StoreGameRequest extends FormRequest
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
      'has_additional_bubble' => 'required|boolean',
      'sessions' => 'required|integer|min:0',
      'tier' => 'required|string',
      'notes' => 'nullable|string',
      'title' => 'nullable|string|max:255',
    ];
  }
}
