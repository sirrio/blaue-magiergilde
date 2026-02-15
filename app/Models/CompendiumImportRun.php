<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CompendiumImportRun extends Model
{
    protected $fillable = [
        'user_id',
        'entity_type',
        'filename',
        'total_rows',
        'new_rows',
        'updated_rows',
        'unchanged_rows',
        'invalid_rows',
        'error_samples',
        'applied_at',
    ];

    protected function casts(): array
    {
        return [
            'error_samples' => 'array',
            'applied_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
