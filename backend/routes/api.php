<?php

use App\Http\Controllers\Api\SectorController;
use Illuminate\Support\Facades\Route;

Route::get('/sectors', SectorController::class);
