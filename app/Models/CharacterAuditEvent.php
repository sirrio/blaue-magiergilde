<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CharacterAuditEvent extends Model
{
    /** @use HasFactory<\Database\Factories\CharacterAuditEventFactory> */
    use HasFactory;

    protected $fillable = [
        'character_id',
        'actor_user_id',
        'action',
        'occurred_at',
        'subject_type',
        'subject_id',
        'delta',
        'state_after',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'delta' => 'array',
            'state_after' => 'array',
            'metadata' => 'array',
        ];
    }

    public function character(): BelongsTo
    {
        return $this->belongsTo(Character::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }
}
