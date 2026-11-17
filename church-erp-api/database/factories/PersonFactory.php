<?php

namespace Database\Factories;

use App\Domain\Identity\Models\Church;
use App\Domain\People\Models\Person;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Person>
 */
class PersonFactory extends Factory
{
    protected $model = Person::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'person_type' => 'member',
            'status' => 'active',
            'display_name' => fake()->name(),
            'phone' => fake()->optional()->e164PhoneNumber(),
            'email' => fake()->unique()->safeEmail(),
            'last_contacted_at' => null,
        ];
    }

    public function forChurch(Church $church): static
    {
        return $this->state(fn (): array => ['church_id' => $church->id]);
    }

    public function member(): static
    {
        return $this->state(fn (): array => ['person_type' => 'member']);
    }

    public function visitor(): static
    {
        return $this->state(fn (): array => ['person_type' => 'visitor']);
    }
}
