<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Models\Adventure;
use App\Models\Character;
use App\Models\Downtime;

class PermanentDeleteCharacterController extends Controller
{
  public function __invoke(Character $character): \Illuminate\Http\RedirectResponse
  {
    $character->adventures()->withTrashed()->forceDelete();
    $character->downtimes()->withTrashed()->forceDelete();
    $character->forceDelete();

    return redirect()->back();
  }
}
