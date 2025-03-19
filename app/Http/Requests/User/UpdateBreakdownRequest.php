<?php

namespace App\Http\Requests\User;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @property mixed $event_bubbles
 * @property mixed $event_coins
 * @property mixed $bt_bubbles
 * @property mixed $bt_coins
 * @property mixed $lt_bubbles
 * @property mixed $lt_coins
 * @property mixed $ht_bubbles
 * @property mixed $ht_coins
 * @property mixed $et_bubbles
 * @property mixed $et_coins
 * @property mixed $other_bubbles
 * @property mixed $other_coins
 */
class UpdateBreakdownRequest extends FormRequest
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
      'event_bubbles' => 'required|integer|min:0',
      'event_coins' => 'required|integer|min:0',
      'bt_bubbles' => 'required|integer|min:0',
      'bt_coins' => 'required|integer|min:0',
      'lt_bubbles' => 'required|integer|min:0',
      'lt_coins' => 'required|integer|min:0',
      'ht_bubbles' => 'required|integer|min:0',
      'ht_coins' => 'required|integer|min:0',
      'et_bubbles' => 'required|integer|min:0',
      'et_coins' => 'required|integer|min:0',
      'other_bubbles' => 'required|integer|min:0',
      'other_coins' => 'required|integer|min:0',
    ];
  }
}
