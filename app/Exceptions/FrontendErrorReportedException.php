<?php

namespace App\Exceptions;

use Exception;

class FrontendErrorReportedException extends Exception
{
    /**
     * @param  array<string, mixed>  $frontendContext
     */
    public function __construct(
        string $message,
        private readonly array $frontendContext = [],
    ) {
        parent::__construct($message);
    }

    /**
     * @return array<string, mixed>
     */
    public function context(): array
    {
        return $this->frontendContext;
    }
}
