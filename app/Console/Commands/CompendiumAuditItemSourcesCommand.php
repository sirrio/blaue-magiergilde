<?php

namespace App\Console\Commands;

use App\Services\CompendiumItemSourceAuditService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use InvalidArgumentException;

class CompendiumAuditItemSourcesCommand extends Command
{
    /**
     * @var string
     */
    protected $signature = 'compendium:audit-item-sources
                            {--mapping= : Optional CSV mapping file with source_shortcode and either url or name+type}
                            {--apply : Persist mapping-backed source assignments}
                            {--report= : Optional JSON report output path}
                            {--sample=20 : Number of sample rows to include in output}';

    /**
     * @var string
     */
    protected $description = 'Audit item source_id consistency and optionally backfill source assignments from an explicit CSV mapping file';

    public function __construct(private readonly CompendiumItemSourceAuditService $auditService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $sampleLimit = max(1, (int) $this->option('sample'));

        $audit = $this->auditService->audit($sampleLimit);
        $this->line('Item source audit summary');
        foreach ($audit['summary'] as $key => $value) {
            $this->line(sprintf('  %s=%s', $key, $value));
        }

        $mappingResult = null;
        $mappingPath = $this->option('mapping');
        if (is_string($mappingPath) && trim($mappingPath) !== '') {
            try {
                $mappingResult = $this->auditService->applyMapping(
                    trim($mappingPath),
                    (bool) $this->option('apply'),
                    $sampleLimit,
                );
            } catch (InvalidArgumentException $exception) {
                $this->error($exception->getMessage());

                return self::FAILURE;
            }

            $this->newLine();
            $this->line('Mapping summary');
            foreach ($mappingResult['summary'] as $key => $value) {
                $this->line(sprintf('  %s=%s', $key, is_bool($value) ? ($value ? 'true' : 'false') : $value));
            }
        }

        $reportPath = $this->option('report');
        if (is_string($reportPath) && trim($reportPath) !== '') {
            $payload = json_encode([
                'generated_at' => now()->toIso8601String(),
                'audit' => $audit,
                'mapping' => $mappingResult,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

            if (! is_string($payload)) {
                $this->error('Report could not be encoded as JSON.');

                return self::FAILURE;
            }

            File::put(trim($reportPath), $payload);
            $this->newLine();
            $this->info(sprintf('Report written to %s', trim($reportPath)));
        }

        return self::SUCCESS;
    }
}
