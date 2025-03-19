<?php

namespace App\Http\Controllers\Ally;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ally\StoreAllyRequest;
use App\Http\Requests\Ally\UpdateAllyRequest;
use App\Models\Ally;
use Illuminate\Http\RedirectResponse;

class AllyController extends Controller
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
  public function store(StoreAllyRequest $request): RedirectResponse
  {
    $ally = new Ally();
    $ally->name = $request->name;
    $ally->standing = $request->standing;
    $ally->character_id = $request->character_id;
    $ally->save();

    return redirect()->back();
  }

  /**
   * Display the specified resource.
   */
  public function show(Ally $ally)
  {
    //
  }

  /**
   * Show the form for editing the specified resource.
   */
  public function edit(Ally $ally)
  {
    //
  }

  /**
   * Update the specified resource in storage.
   */
  public function update(UpdateAllyRequest $request, Ally $ally)
  {
    //
  }

  /**
   * Remove the specified resource from storage.
   */
  public function destroy(Ally $ally): RedirectResponse
  {
    $ally->delete();

    return redirect()->back();
  }
}
