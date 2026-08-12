<?php

use App\Models\Sector;
use Database\Seeders\SectorSeeder;

beforeEach(function () {
    $this->seed(SectorSeeder::class);
});

it('returns every sector from the database', function () {
    $this->getJson('/api/sectors')
        ->assertOk()
        ->assertCookie('XSRF-TOKEN')
        ->assertJsonCount(79, 'data')
        ->assertJsonStructure([
            'data' => ['*' => ['id', 'parent_id', 'name']],
        ]);
});

it('can seed sectors repeatedly without creating duplicates', function () {
    $this->seed(SectorSeeder::class);

    expect(Sector::query()->count())->toBe(79);
});
