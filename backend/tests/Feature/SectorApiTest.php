<?php

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
