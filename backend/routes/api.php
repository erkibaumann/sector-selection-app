<?php

use App\Http\Controllers\Api\SectorController;
use App\Http\Controllers\Api\SubmissionController;
use Illuminate\Support\Facades\Route;

Route::get('/sectors', SectorController::class);
Route::get('/submission', [SubmissionController::class, 'show']);
Route::post('/submission', [SubmissionController::class, 'store']);
