<?php

namespace App\Http\Controllers\Adventure;

use App\Http\Controllers\Controller;
use App\Http\Requests\Adventure\StoreAdventureRequest;
use App\Http\Requests\Adventure\UpdateAdventureRequest;
use App\Models\Adventure;

class AdventureController extends Controller
{
  /**
   * Display a listing of the resource.
   */
  public function index()
  {
    //
  }

  /**
   * Show the form for creating a new resource.
   */
  public function create()
  {
    //
  }

  /**
   * Store a newly created resource in storage.
   */
  public function store(StoreAdventureRequest $request): \Illuminate\Http\RedirectResponse
  {
    $adventure = new Adventure();
    $adventure->duration = $request->duration;
    $adventure->title = $request->title;
    $adventure->game_master = $request->game_master;
    $adventure->character_id = $request->character_id;
    $adventure->start_date = $request->start_date;
    $adventure->has_additional_bubble = $request->has_additional_bubble;
    $adventure->notes = $request->notes;
    $adventure->save();

    return redirect()->back();
  }

  /**
   * Display the specified resource.
   */
  public function show(Adventure $adventure)
  {
    //
  }

  /**
   * Show the form for editing the specified resource.
   */
  public function edit(Adventure $adventure)
  {
    //
  }

  /**
   * Update the specified resource in storage.
   */
  public function update(UpdateAdventureRequest $request, Adventure $adventure): \Illuminate\Http\RedirectResponse
  {
    $adventure->duration = $request->duration;
    $adventure->start_date = $request->start_date;
    $adventure->title = $request->title;
    $adventure->game_master = $request->game_master;
    $adventure->has_additional_bubble = $request->has_additional_bubble;
    $adventure->notes = $request->notes;
    $adventure->save();

    return redirect()->back();
  }

  /**
   * Remove the specified resource from storage.
   */
  public function destroy(Adventure $adventure): \Illuminate\Http\RedirectResponse
  {
    $adventure->delete();

    return redirect()->back();
  }
}
