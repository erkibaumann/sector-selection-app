<?php

use App\Http\Controllers\Api\SectorController;
use App\Http\Controllers\Api\SubmissionController;
use Illuminate\Support\Facades\Route;

/*
 * Lets the Angular client prime the XSRF-TOKEN cookie before its first write.
 * The CSRF middleware attaches the cookie to any response it passes through,
 * so this endpoint only needs to exist — it has no body of its own.
 */
Route::get('/csrf-cookie', fn () => response()->noContent())->name('csrf-cookie');

Route::get('/sectors', SectorController::class);
Route::get('/submission', [SubmissionController::class, 'show']);
Route::post('/submission', [SubmissionController::class, 'store']);
