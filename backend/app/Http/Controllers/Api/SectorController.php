<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SectorResource;
use App\Models\Sector;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SectorController extends Controller
{
    public function __invoke(): AnonymousResourceCollection
    {
        return SectorResource::collection(
            Sector::query()->orderBy('id')->get()
        );
    }
}
