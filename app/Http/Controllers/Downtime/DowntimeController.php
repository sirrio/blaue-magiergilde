<?php

namespace App\Http\Controllers\Downtime;

use App\Http\Controllers\Controller;
use App\Http\Requests\Downtime\StoreDowntimeRequest;
use App\Http\Requests\Downtime\UpdateDowntimeRequest;
use App\Models\Downtime;
use App\Support\CharacterAuditTrail;
use Illuminate\Http\RedirectResponse;

class DowntimeController extends Controller
{
    public function __construct(private readonly CharacterAuditTrail $auditTrail) {}

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
        $downtime = new Downtime;
        $downtime->duration = $request->duration;
        $downtime->character_id = $request->character_id;
        $downtime->start_date = $request->start_date;
        $downtime->type = $request->type;
        $downtime->notes = $request->notes;
        $downtime->save();
        $this->auditTrail->record($downtime->character, 'downtime.created', delta: [
            'downtime_seconds' => (int) $downtime->duration,
        ], metadata: [
            'type' => $downtime->type,
            'start_date' => $downtime->start_date,
        ], subject: $downtime);

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
        $previous = [
            'duration' => (int) $downtime->duration,
            'start_date' => $downtime->start_date,
            'type' => $downtime->type,
        ];
        $downtime->duration = $request->duration;
        $downtime->start_date = $request->start_date;
        $downtime->notes = $request->notes;
        $downtime->type = $request->type;
        $downtime->save();
        $this->auditTrail->record($downtime->character, 'downtime.updated', delta: [
            'downtime_seconds' => (int) $downtime->duration - $previous['duration'],
        ], metadata: [
            'before' => $previous,
            'after' => [
                'duration' => (int) $downtime->duration,
                'start_date' => $downtime->start_date,
                'type' => $downtime->type,
            ],
        ], subject: $downtime);

        return redirect()->back();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Downtime $downtime): RedirectResponse
    {
        $character = $downtime->character;
        $duration = (int) $downtime->duration;
        $metadata = [
            'type' => $downtime->type,
            'start_date' => $downtime->start_date,
        ];
        $downtime->delete();
        $this->auditTrail->record($character, 'downtime.deleted', delta: [
            'downtime_seconds' => -$duration,
        ], metadata: $metadata, subject: $downtime);

        return redirect()->back();
    }
}
