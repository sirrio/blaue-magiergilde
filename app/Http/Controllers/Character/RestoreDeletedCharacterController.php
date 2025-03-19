<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Models\Adventure;
use App\Models\Character;
use App\Models\Downtime;
use Illuminate\Http\RedirectResponse;

class RestoreDeletedCharacterController extends Controller
{
  public function __invoke(Character $character): RedirectResponse
  {
    $character->adventures()->withTrashed()->each(function (Adventure $adventure) {
      $adventure->restore();
    });
    $character->downtimes()->withTrashed()->each(function (Downtime $downtime) {
      $downtime->restore();
    });
    $character->restore();

    return to_route('characters.index');
  }
}
