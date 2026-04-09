<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateLevelProgressionRequest;
use App\Models\LevelProgressionEntry;
use App\Support\LevelProgression;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class LevelProgressionController extends Controller
{
    public function update(UpdateLevelProgressionRequest $request): RedirectResponse
    {
        $entries = collect($request->validated('entries'))
            ->map(fn (array $entry): array => [
                'level' => (int) $entry['level'],
                'required_bubbles' => (int) $entry['required_bubbles'],
            ])
            ->sortBy('level')
            ->values();

        DB::transaction(function () use ($entries): void {
            foreach ($entries as $entry) {
                LevelProgressionEntry::query()->updateOrCreate(
                    ['level' => $entry['level']],
                    ['required_bubbles' => $entry['required_bubbles']],
                );
            }
        });

        LevelProgression::clearCache();

        return redirect()->back();
    }
}
