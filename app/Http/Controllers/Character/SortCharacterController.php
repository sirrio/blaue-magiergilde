<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Http\Requests\Character\SortCharacterRequest;
use App\Models\Character;
use Illuminate\Http\RedirectResponse;

class SortCharacterController extends Controller
{
  public function __invoke(SortCharacterRequest $request): RedirectResponse
  {
    $list = $request->list;
    foreach ($list as $key => $value) {
      $char = Character::query()->find($value['id']);
      $char->position = $key;
      $char->save();
    }

    return redirect()->back();
  }
}
