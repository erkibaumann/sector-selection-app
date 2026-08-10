<?php

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

it('orders sectors alphabetically by name', function () {
    $names = array_column($this->getJson('/api/sectors')->json('data'), 'name');
    $sorted = $names;
    usort($sorted, strcmp(...));
    expect($names)->toBe($sorted);
});
