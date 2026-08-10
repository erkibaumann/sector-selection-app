<?php

use App\Models\Sector;
use Database\Seeders\SectorSeeder;

beforeEach(function () {
    $this->withHeader('Origin', 'http://localhost:4200');
    $this->seed(SectorSeeder::class);
});

it('returns every sector from the database', function () {
    $this->getJson('/api/sectors')
        ->assertOk()
        ->assertJsonCount(79, 'data')
        ->assertJsonStructure([
            'data' => ['*' => ['id', 'parent_id', 'name']],
        ]);
});

it('can seed sectors repeatedly without creating duplicates', function () {
    $this->seed(SectorSeeder::class);

    expect(Sector::query()->count())->toBe(79);
});

it('orders sectors alphabetically by name', function () {
    $names = array_column($this->getJson('/api/sectors')->json('data'), 'name');
    $sorted = $names;
    usort($sorted, strcmp(...));
    expect($names)->toBe($sorted);
});
