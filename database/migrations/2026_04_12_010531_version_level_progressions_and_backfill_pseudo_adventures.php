<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('level_progression_versions', function (Blueprint $table) {
            $table->id();
            $table->boolean('is_active')->default(false);
            $table->timestamps();
        });

        $now = now();
        $versionId = DB::table('level_progression_versions')->insertGetId([
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        Schema::table('level_progressions', function (Blueprint $table) {
            $table->foreignId('version_id')->nullable()->after('id');
        });

        DB::table('level_progressions')->update(['version_id' => $versionId]);

        Schema::table('level_progressions', function (Blueprint $table) {
            $table->dropUnique(['level']);
            $table->foreign('version_id')->references('id')->on('level_progression_versions');
            $table->unique(['version_id', 'level']);
        });

        Schema::table('adventures', function (Blueprint $table) {
            $table->unsignedTinyInteger('target_level')->nullable()->after('is_pseudo');
            $table->foreignId('progression_version_id')->nullable()->after('target_level')->constrained('level_progression_versions');
        });

        $totals = DB::table('level_progressions')
            ->where('version_id', $versionId)
            ->orderBy('level')
            ->pluck('required_bubbles', 'level')
            ->mapWithKeys(fn (mixed $requiredBubbles, mixed $level) => [(int) $level => (int) $requiredBubbles])
            ->all();

        DB::table('characters')
            ->select(['id', 'start_tier', 'dm_bubbles', 'bubble_shop_spend'])
            ->whereExists(function ($query): void {
                $query
                    ->selectRaw('1')
                    ->from('adventures')
                    ->whereColumn('adventures.character_id', 'characters.id')
                    ->whereNull('adventures.deleted_at')
                    ->where('adventures.is_pseudo', true);
            })
            ->orderBy('id')
            ->chunkById(50, function (Collection $characters) use ($totals, $versionId): void {
                foreach ($characters as $character) {
                    $adventures = DB::table('adventures')
                        ->select(['id', 'duration', 'has_additional_bubble', 'is_pseudo'])
                        ->where('character_id', $character->id)
                        ->whereNull('deleted_at')
                        ->orderBy('start_date')
                        ->orderBy('id')
                        ->get();

                    $runningAdventureBubbles = 0;
                    $dmBubbles = $this->safeInt($character->dm_bubbles);
                    $bubbleSpend = $this->safeInt($character->bubble_shop_spend);
                    $additionalBubbles = $this->additionalBubblesForStartTier($character->start_tier);

                    foreach ($adventures as $adventure) {
                        $runningAdventureBubbles += $this->bubblesForAdventure(
                            $this->safeInt($adventure->duration),
                            (bool) $adventure->has_additional_bubble,
                        );

                        if (! $adventure->is_pseudo) {
                            continue;
                        }

                        $availableBubbles = max(0, $runningAdventureBubbles + $dmBubbles + $additionalBubbles - $bubbleSpend);

                        DB::table('adventures')
                            ->where('id', $adventure->id)
                            ->update([
                                'target_level' => $this->levelFromAvailableBubbles($availableBubbles, $totals),
                                'progression_version_id' => $versionId,
                            ]);
                    }
                }
            });
    }

    public function down(): void
    {
        Schema::table('adventures', function (Blueprint $table) {
            $table->dropConstrainedForeignId('progression_version_id');
            $table->dropColumn('target_level');
        });

        Schema::table('level_progressions', function (Blueprint $table) {
            $table->dropUnique(['version_id', 'level']);
            $table->dropForeign(['version_id']);
            $table->dropColumn('version_id');
            $table->unique('level');
        });

        Schema::dropIfExists('level_progression_versions');
    }

    private function bubblesForAdventure(int $duration, bool $hasAdditionalBubble): int
    {
        return (int) floor($duration / 10800) + ($hasAdditionalBubble ? 1 : 0);
    }

    private function additionalBubblesForStartTier(?string $startTier): int
    {
        return match (strtolower((string) $startTier)) {
            'lt' => 10,
            'ht' => 55,
            default => 0,
        };
    }

    /**
     * @param  array<int, int>  $totals
     */
    private function levelFromAvailableBubbles(int $availableBubbles, array $totals): int
    {
        $remainingBubbles = max(0, $availableBubbles);
        $level = 1;

        while ($level < 20) {
            $requiredForNextLevel = $totals[$level + 1] - $totals[$level];

            if ($remainingBubbles < $requiredForNextLevel) {
                break;
            }

            $remainingBubbles -= $requiredForNextLevel;
            $level++;
        }

        return $level;
    }

    private function safeInt(mixed $value, int $fallback = 0): int
    {
        $number = filter_var($value, FILTER_VALIDATE_INT);

        return $number !== false ? (int) $number : $fallback;
    }
};
