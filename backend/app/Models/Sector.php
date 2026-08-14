<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\WithoutIncrementing;
use Illuminate\Database\Eloquent\Attributes\WithoutTimestamps;
use Illuminate\Database\Eloquent\Model;

#[WithoutIncrementing]
#[WithoutTimestamps]
class Sector extends Model
{
    protected function casts(): array
    {
        return [
            'id' => 'integer',
            'parent_id' => 'integer',
        ];
    }
}
