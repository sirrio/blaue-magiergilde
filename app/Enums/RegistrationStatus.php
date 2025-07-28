<?php

namespace App\Enums;

enum RegistrationStatus: string
{
    case PENDING = 'pending';
    case IN_REVIEW = 'in_review';
    case APPROVED = 'approved';
    case REJECTED = 'rejected';
    case NEEDS_INFO = 'needs_info';
    case ON_HOLD = 'on_hold';
}
