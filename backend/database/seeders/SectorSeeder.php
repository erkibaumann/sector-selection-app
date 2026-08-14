<?php

namespace Database\Seeders;

use App\Models\Sector;
use Illuminate\Database\Seeder;

class SectorSeeder extends Seeder
{
    public function run(): void
    {
        Sector::query()->upsert(
            require database_path('data/sectors.php'),
            ['id'],
            ['parent_id', 'name'],
        );
    }
}
