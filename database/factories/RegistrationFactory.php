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
            'character_name' => $this->faker->name(),
            'character_url' => $this->faker->url(),
            'tier' => $this->faker->randomElement(['bt', 'lt', 'ht', 'et']),
            'discord_name' => $this->faker->userName(),
            'status' => 'pending',
        ];
    }
}
