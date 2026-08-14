<?php

use App\Models\Submission;
use Database\Seeders\SectorSeeder;
use Illuminate\Support\Str;

beforeEach(function () {
    // Laravel's JSON test helpers only include configured cookies with this enabled.
    $this->withCredentials();
    $this->seed(SectorSeeder::class);
});

it('validates required fields and selectable sector ids', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('/api/submission', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'sector_ids', 'agreed_to_terms']);

    $this->postJson('/api/submission', [
        'name' => 'Jaan Kask',
        'sector_ids' => [67878],
        'agreed_to_terms' => true,
    ])->assertUnprocessable()->assertJsonValidationErrors('sector_ids.0');

    $this->postJson('/api/submission', [
        'name' => 'Katrin Saar',
        'sector_ids' => [559],
        'agreed_to_terms' => true,
    ])->assertUnprocessable()->assertJsonValidationErrors('sector_ids.0');
});

it('answers validation errors in the requested language', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('/api/submission', [
        'name' => '',
        'sector_ids' => ['invalid'],
        'agreed_to_terms' => false,
    ], ['Accept-Language' => 'et'])->assertUnprocessable()->assertJson([
        'errors' => [
            'name' => ['Väli nimi on kohustuslik.'],
            'sector_ids.0' => ['Väli sektor peab olema täisarv.'],
            'agreed_to_terms' => ['Väli tingimustega nõustumine tuleb aktsepteerida.'],
        ],
    ]);
});

it('rate limits submission requests', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    for ($attempt = 0; $attempt < 60; $attempt++) {
        $this->postJson('/api/submission', [])->assertUnprocessable();
    }

    $this->postJson('/api/submission', [])
        ->assertTooManyRequests()
        ->assertHeader('Retry-After');
});

it('creates, returns, and updates one submission for the same session', function () {
    $sessionId = Str::random(40);
    $this->withCookie(config('session.cookie'), $sessionId);

    $this->getJson('/api/submission')->assertNoContent();

    $createResponse = $this->postJson('/api/submission', [
        'name' => 'Katrin Saar',
        'sector_ids' => [141, 121, 75],
        'agreed_to_terms' => true,
    ]);

    $createResponse->assertCreated()
        ->assertJson(['data' => ['name' => 'Katrin Saar', 'agreed_to_terms' => true]]);

    expect($createResponse->json('data.sector_ids'))->toEqualCanonicalizing([141, 121, 75]);

    $this->assertDatabaseHas('submissions', [
        'session_id' => $sessionId,
        'name' => 'Katrin Saar',
        'agreed_to_terms' => true,
    ]);

    $storedResponse = $this->getJson('/api/submission')->assertOk();

    expect($storedResponse->json('data.name'))->toBe('Katrin Saar')
        ->and($storedResponse->json('data.sector_ids'))->toEqualCanonicalizing([141, 121, 75]);

    $updateResponse = $this->postJson('/api/submission', [
        'name' => 'Mari Tamm',
        'sector_ids' => [29, 111],
        'agreed_to_terms' => true,
    ])->assertOk();

    expect(Submission::count())->toBe(1)
        ->and($updateResponse->json('data.name'))->toBe('Mari Tamm')
        ->and($updateResponse->json('data.sector_ids'))->toEqualCanonicalizing([29, 111])
        ->and(Submission::sole()->sectors()->pluck('sectors.id')->all())
        ->toEqualCanonicalizing([29, 111]);
});

it('does not expose a submission to a different session', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('/api/submission', [
        'name' => 'Jaan Kask',
        'sector_ids' => [337],
        'agreed_to_terms' => true,
    ])->assertCreated();

    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->getJson('/api/submission')->assertNoContent();
});
