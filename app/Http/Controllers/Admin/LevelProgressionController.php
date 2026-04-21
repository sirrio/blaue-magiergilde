<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateLevelProgressionRequest;
use App\Models\LevelProgressionEntry;
use App\Models\LevelProgressionVersion;
use App\Support\LevelProgression;
use App\Support\PseudoAdventureLevelAlignment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class LevelProgressionController extends Controller
{
    public function __construct(
        public PseudoAdventureLevelAlignment $pseudoAdventureLevelAlignment,
    ) {}

    public function update(UpdateLevelProgressionRequest $request): RedirectResponse
    {
        $entries = collect($request->validated('entries'))
            ->map(fn (array $entry): array => [
                'level' => (int) $entry['level'],
                'required_bubbles' => (int) $entry['required_bubbles'],
            ])
            ->sortBy('level')
            ->values();

        $currentTotals = collect(LevelProgression::totals())
            ->map(fn (int $requiredBubbles, int $level): array => [
                'level' => $level,
                'required_bubbles' => $requiredBubbles,
            ])
            ->values()
            ->all();

        if ($entries->all() === $currentTotals) {
            return redirect()->back();
        }

        $report = DB::transaction(function () use ($entries): array {
            $currentVersionId = LevelProgression::activeVersionId();

            $backfillReport = $this->pseudoAdventureLevelAlignment->backfillMissingMetadata($currentVersionId);

            LevelProgressionVersion::query()
                ->where('is_active', true)
                ->update(['is_active' => false]);

            $newVersion = LevelProgressionVersion::query()->create([
                'is_active' => true,
            ]);

            foreach ($entries as $entry) {
                LevelProgressionEntry::query()->create([
                    'version_id' => $newVersion->id,
                    'level' => $entry['level'],
                    'required_bubbles' => $entry['required_bubbles'],
                ]);
            }

            $charactersPendingUpgrade = \App\Models\Character::query()
                ->whereNull('deleted_at')
                ->where(function ($query) use ($newVersion): void {
                    $query
                        ->whereNull('progression_version_id')
                        ->orWhere('progression_version_id', '!=', $newVersion->id);
                })
                ->count();

            return [
                'new_version_id' => $newVersion->id,
                'backfill' => $backfillReport,
                'characters_pending_upgrade' => $charactersPendingUpgrade,
            ];
        });

        LevelProgression::clearCache();

        return redirect()->back()->with('level_progression_update', $report);
    }
}
