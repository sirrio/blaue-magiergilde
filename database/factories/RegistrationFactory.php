<?php

namespace Database\Factories;

use App\Models\Registration;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Registration>
 */
class RegistrationFactory extends Factory
{
    protected $model = Registration::class;

    public function definition(): array
    {
        return [
            'link' => $this->faker->url(),
            'tier' => $this->faker->randomElement(['bt', 'lt', 'ht', 'et']),
        ];
    }
}
