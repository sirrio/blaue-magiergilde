<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\UpdateBreakdownRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;

class BreakdownController extends Controller
{
  /**
   * Update the specified resource in storage.
   */
  public function update(UpdateBreakdownRequest $request, User $user): RedirectResponse
  {
    $user->event_bubbles = $request->event_bubbles;
    $user->event_coins = $request->event_coins;
    $user->bt_bubbles = $request->bt_bubbles;
    $user->bt_coins = $request->bt_coins;
    $user->lt_bubbles = $request->lt_bubbles;
    $user->lt_coins = $request->lt_coins;
    $user->ht_bubbles = $request->ht_bubbles;
    $user->ht_coins = $request->ht_coins;
    $user->et_bubbles = $request->et_bubbles;
    $user->et_coins = $request->et_coins;
    $user->other_bubbles = $request->other_bubbles;
    $user->other_coins = $request->other_coins;

    $user->save();

    return redirect()->back();
  }
}
