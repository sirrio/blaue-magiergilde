<?php

namespace App\Http\Requests\Item;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

/**
 * @property mixed $name
 * @property mixed $url
 * @property mixed $cost
 * @property mixed $rarity
 * @property mixed $type
 */
class UpdateItemRequest extends FormRequest
{
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
      'id' => 'required|numeric|exists:items,id',
      'name' => 'required|string',
      'url' => 'url',
      'cost' => 'string',
      'rarity' => 'required|string',
      'type' => 'required|string',
    ];
  }
}
