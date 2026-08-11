<?php

use App\Models\Submission;
use Database\Seeders\SectorSeeder;
use Illuminate\Support\Str;

beforeEach(function () {
    // Laravel's JSON test helpers only include configured cookies with this enabled.
    $this->withCredentials();
    $this->seed(SectorSeeder::class);
});

it('returns no content when the session has no submissions', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->getJson('api/submission')->assertNoContent();
});

it('rejects a submission with missing fields', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('api/submission', [])
        ->assertunprocessable()
        ->assertJsonValidationErrors(['name', 'sector_ids', 'agreed_to_terms']);
});

it('rejects a whitespace-only name', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('/api/submission', [
        'name' => '   ',
        'sector_ids' => [342],
        'agreed_to_terms' => true,
    ])->assertUnprocessable()->assertJsonValidationErrors('name');
});

it('rejects a name containing digits or symbols', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('/api/submission', [
        'name' => 'J0hn #1',
        'sector_ids' => [342],
        'agreed_to_terms' => true,
    ])->assertUnprocessable()->assertJsonValidationErrors('name');
});

it('accepts a name with accents, apostrophes and hyphens', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('/api/submission', [
        'name' => "Ülo O'Brien-Kärner",
        'sector_ids' => [342],
        'agreed_to_terms' => true,
    ])->assertCreated();
});

it('rejects a name longer than 255 characters', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('/api/submission', [
        'name' => str_repeat('A', 256),
        'sector_ids' => [342],
        'agreed_to_terms' => true,
    ])->assertUnprocessable()->assertJsonValidationErrors('name');
});

it('rejects sector ids that do not exist', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('api/submission', [
        'name' => 'John Doe',
        'sector_ids' => [67878, 89088, 5000],
        'agreed_to_terms' => true,
    ])->assertJsonValidationErrors('sector_ids.0');
});

it('rejects duplicate sector ids', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('/api/submission', [
        'name' => 'John Doe',
        'sector_ids' => [342, 342],
        'agreed_to_terms' => true,
    ])->assertUnprocessable()->assertJsonValidationErrors([
        'sector_ids.0',
        'sector_ids.1',
    ]);
});

it('rate limits submission requests', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    for ($attempt = 0; $attempt < 60; $attempt++) {
        $this->postJson('/api/submission', [
            'name' => 'John Doe',
            'sector_ids' => [342],
            'agreed_to_terms' => true,
        ])->assertSuccessful();
    }

    $this->postJson('/api/submission', [
        'name' => 'John Doe',
        'sector_ids' => [342],
        'agreed_to_terms' => true,
    ])->assertTooManyRequests()->assertHeader('Retry-After');
});

it('stores a submission for the current session', function () {
    $sessionId = Str::random(40);
    $this->withCookie(config('session.cookie'), $sessionId);

    $response = $this->postJson('api/submission', [
        'name' => 'John Doe',
        'sector_ids' => [101, 67, 19],
        'agreed_to_terms' => true,
    ]);

    $response->assertCreated()
        ->assertJson(['data' => ['name' => 'John Doe', 'agreed_to_terms' => true]]);

    expect($response->json('data.sector_ids'))->toEqualCanonicalizing([101, 67, 19]);

    $this->assertDatabaseHas('submissions', [
        'session_id' => $sessionId,
        'name' => 'John Doe',
        'agreed_to_terms' => true,
    ]);

    $submission = Submission::sole();

    $this->assertDatabaseHas('sector_submission', [
        'submission_id' => $submission->id,
        'sector_id' => 101,
    ]);
    $this->assertDatabaseHas('sector_submission', [
        'submission_id' => $submission->id,
        'sector_id' => 67,
    ]);
    $this->assertDatabaseHas('sector_submission', [
        'submission_id' => $submission->id,
        'sector_id' => 19,
    ]);
});

it('returns the stored submission so the form can refill', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('/api/submission', [
        'name' => 'John Doe',
        'sector_ids' => [67, 101],
        'agreed_to_terms' => true,
    ])->assertCreated();

    $response = $this->getJson('/api/submission')->assertOk();

    expect($response->json('data.name'))->toBe('John Doe')
        ->and($response->json('data.agreed_to_terms'))->toBeTrue()
        ->and($response->json('data.sector_ids'))->toEqualCanonicalizing([67, 101]);
});

it('updates the existing submission for the same session', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('/api/submission', [
        'name' => 'Ada Lovelace',
        'sector_ids' => [342],
        'agreed_to_terms' => true,
    ])->assertCreated();

    $response = $this->postJson('/api/submission', [
        'name' => 'Grace Hopper',
        'sector_ids' => [43, 40],
        'agreed_to_terms' => true,
    ]);

    $response->assertOk();

    expect(Submission::count())->toBe(1)
        ->and($response->json('data.name'))->toBe('Grace Hopper')
        ->and($response->json('data.sector_ids'))->toEqualCanonicalizing([43, 40]);

    $this->assertDatabaseMissing('sector_submission', [
        'submission_id' => Submission::sole()->id, 'sector_id' => 342,
    ]);
});

it('does not expose a submission to a different session', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('/api/submission', [
        'name' => 'Ada Lovelace',
        'sector_ids' => [342],
        'agreed_to_terms' => true,
    ])->assertCreated();

    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->getJson('/api/submission')->assertNoContent();
});
