<?php

namespace App\Exceptions;

use Exception;

class BotErrorReportedException extends Exception
{
    /**
     * @param  array<string, mixed>  $botContext
     */
    public function __construct(
        string $message,
        private readonly array $botContext = [],
    ) {
        parent::__construct($message);
    }

    /**
     * @return array<string, mixed>
     */
    public function context(): array
    {
        return $this->botContext;
    }
}
