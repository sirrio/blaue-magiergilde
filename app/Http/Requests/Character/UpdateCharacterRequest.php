<?php

namespace App\Http\Requests\Character;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @property mixed $class
 * @property mixed $external_link
 * @property mixed $name
 * @property mixed $version
 * @property mixed $dm_bubbles
 * @property mixed $dm_coins
 * @property mixed $bubble_shop_spend
 * @property mixed $faction
 * @property mixed $notes
 */
class UpdateCharacterRequest extends FormRequest
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
      'name' => 'required|string',
      'class' => 'required|exists:character_classes,id',
      'external_link' => 'required|url',
      'version' => 'required|string',
      'dm_bubbles' => 'required|integer|min:0',
      'dm_coins' => 'required|integer|min:0',
      'is_filler' => 'required|boolean',
      'bubble_shop_spend' => 'required|integer|min:0',
      'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp',
    ];
  }
}
