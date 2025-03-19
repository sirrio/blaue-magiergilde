<?php

namespace App\Http\Requests\Adventure;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @property integer $duration
 * @property integer $character_id
 * @property mixed $start_date
 * @property mixed $has_additional_bubble
 * @property mixed $notes
 * @property mixed $title
 * @property mixed $game_master
 */
class StoreAdventureRequest extends FormRequest
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
      'duration' => 'required|integer|min:0',
      'character_id' => 'required|integer',
      'start_date' => 'required|date',
      'has_additional_bubble' => 'required|boolean',
      'notes' => 'nullable|string',
      'game_master' => 'nullable|string',
      'title' => 'nullable|string|max:255',
    ];
  }
}
