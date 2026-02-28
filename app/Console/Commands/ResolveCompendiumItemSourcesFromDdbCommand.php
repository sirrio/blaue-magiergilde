<?php

namespace App\Console\Commands;

use App\Services\CompendiumItemSourceResolverService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class ResolveCompendiumItemSourcesFromDdbCommand extends Command
{
    /**
     * @var string
     */
    protected $signature = 'compendium:resolve-item-sources-from-ddb
                            {--limit=0 : Maximum number of items to inspect (0 = all)}
                            {--timeout=15 : HTTP timeout in seconds per request}
                            {--all : Include already sourced items instead of only missing ones}
                            {--output= : Optional CSV output path}
                            {--report= : Optional JSON report output path}';

    /**
     * @var string
     */
    protected $description = 'Resolve item sources from D&D Beyond URLs and generate a CSV for the existing compendium import';

    public function __construct(private readonly CompendiumItemSourceResolverService $resolverService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $limit = max(0, (int) $this->option('limit'));
        $timeout = max(1, (int) $this->option('timeout'));
        $onlyMissing = ! ((bool) $this->option('all'));

        $result = $this->resolverService->resolveForImport(
            onlyMissing: $onlyMissing,
            limit: $limit,
            timeout: $timeout,
        );

        $outputPath = $this->resolveOutputPath($this->option('output'));
        $this->writeCsv($outputPath, $result['rows']);

        $this->line('D&D Beyond source resolver summary');
        foreach ($result['summary'] as $key => $value) {
            $this->line(sprintf('  %s=%s', $key, is_bool($value) ? ($value ? 'true' : 'false') : $value));
        }

        $this->newLine();
        $this->info(sprintf('Import CSV written to %s', $outputPath));

        $reportPath = $this->option('report');
        if (is_string($reportPath) && trim($reportPath) !== '') {
            $payload = json_encode([
                'generated_at' => now()->toIso8601String(),
                'summary' => $result['summary'],
                'results' => $result['results'],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

            if (! is_string($payload)) {
                $this->error('Report could not be encoded as JSON.');

                return self::FAILURE;
            }

            File::ensureDirectoryExists(dirname(trim($reportPath)));
            File::put(trim($reportPath), $payload);
            $this->info(sprintf('Report written to %s', trim($reportPath)));
        }

        return self::SUCCESS;
    }

    private function resolveOutputPath(mixed $optionValue): string
    {
        if (is_string($optionValue) && trim($optionValue) !== '') {
            $path = trim($optionValue);
        } else {
            $path = storage_path('app/compendium-item-source-import-'.now()->format('Ymd_His').'.csv');
        }

        File::ensureDirectoryExists(dirname($path));

        return $path;
    }

    /**
     * @param  list<array<string, string>>  $rows
     */
    private function writeCsv(string $path, array $rows): void
    {
        $handle = fopen($path, 'wb');
        if ($handle === false) {
            throw new \RuntimeException("CSV output could not be opened: {$path}");
        }

        fputcsv($handle, [
            'name',
            'type',
            'rarity',
            'cost',
            'extra_cost_note',
            'url',
            'source_shortcode',
            'guild_enabled',
            'shop_enabled',
            'ruling_changed',
            'ruling_note',
        ]);

        foreach ($rows as $row) {
            fputcsv($handle, [
                $row['name'],
                $row['type'],
                $row['rarity'],
                $row['cost'],
                $row['extra_cost_note'],
                $row['url'],
                $row['source_shortcode'],
                $row['guild_enabled'],
                $row['shop_enabled'],
                $row['ruling_changed'],
                $row['ruling_note'],
            ]);
        }

        fclose($handle);
    }
}
