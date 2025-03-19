<?php

namespace App\Http\Controllers\Downtime;

use App\Http\Controllers\Controller;
use App\Http\Requests\Downtime\StoreDowntimeRequest;
use App\Http\Requests\Downtime\UpdateDowntimeRequest;
use App\Models\Downtime;
use Illuminate\Http\RedirectResponse;

class DowntimeController extends Controller
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
  public function store(StoreDowntimeRequest $request): RedirectResponse
  {
    $downtime = new Downtime();
    $downtime->duration = $request->duration;
    $downtime->character_id = $request->character_id;
    $downtime->start_date = $request->start_date;
    $downtime->type = $request->type;
    $downtime->notes = $request->notes;
    $downtime->save();

    return redirect()->back();
  }

  /**
   * Display the specified resource.
   */
  public function show(Downtime $downtime)
  {
    //
  }

  /**
   * Show the form for editing the specified resource.
   */
  public function edit(Downtime $downtime)
  {
    //
  }

  /**
   * Update the specified resource in storage.
   */
  public function update(UpdateDowntimeRequest $request, Downtime $downtime): RedirectResponse
  {
    $downtime->duration = $request->duration;
    $downtime->start_date = $request->start_date;
    $downtime->notes = $request->notes;
    $downtime->type = $request->type;
    $downtime->save();

    return redirect()->back();
  }

  /**
   * Remove the specified resource from storage.
   */
  public function destroy(Downtime $downtime): RedirectResponse
  {
    $downtime->delete();

    return redirect()->back();
  }
}
