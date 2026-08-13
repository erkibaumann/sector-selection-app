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
        'sector_ids' => [150],
        'agreed_to_terms' => true,
    ])->assertUnprocessable()->assertJsonValidationErrors('name');
});

it('accepts a name with Unicode letters and punctuation', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('/api/submission', [
        'name' => "Ülo O'Brien-Kärner",
        'sector_ids' => [37],
        'agreed_to_terms' => true,
    ])->assertCreated();
});

it('rejects sector ids sent as an object rather than a list', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('/api/submission', [
        'name' => 'Mari Tamm',
        'sector_ids' => ['unexpected_key' => 392],
        'agreed_to_terms' => true,
    ])->assertUnprocessable()->assertJsonValidationErrors('sector_ids');
});

it('rejects a name longer than 255 characters', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('/api/submission', [
        'name' => str_repeat('A', 256),
        'sector_ids' => [112],
        'agreed_to_terms' => true,
    ])->assertUnprocessable()->assertJsonValidationErrors('name');
});

it('rejects sector ids that do not exist', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('api/submission', [
        'name' => 'Jaan Kask',
        'sector_ids' => [67878, 89088, 5000],
        'agreed_to_terms' => true,
    ])->assertJsonValidationErrors('sector_ids.0');
});

it('rejects category sector ids', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('/api/submission', [
        'name' => 'Katrin Saar',
        'sector_ids' => [559],
        'agreed_to_terms' => true,
    ])->assertUnprocessable()->assertJsonValidationErrors('sector_ids.0');
});

it('accepts leaf sectors at any depth', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('/api/submission', [
        'name' => 'Mari Tamm',
        'sector_ids' => [19, 342, 53],
        'agreed_to_terms' => true,
    ])->assertCreated();
});

it('uses human-readable field names in validation messages', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('/api/submission', [
        'name' => 'Jaan Kask',
        'sector_ids' => ['invalid'],
        'agreed_to_terms' => true,
    ])->assertUnprocessable()->assertJson([
        'errors' => [
            'sector_ids.0' => ['The sector field must be an integer.'],
        ],
    ]);
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

it('falls back to English for a language it has no translations for', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('/api/submission', [
        'name' => '',
        'sector_ids' => [122],
        'agreed_to_terms' => true,
    ], ['Accept-Language' => 'fr-FR'])->assertUnprocessable()->assertJson([
        'errors' => [
            'name' => ['The name field is required.'],
        ],
    ]);
});

it('rejects duplicate sector ids', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('/api/submission', [
        'name' => 'Katrin Saar',
        'sector_ids' => [45, 45],
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
            'name' => 'Mari Tamm',
            'sector_ids' => [576],
            'agreed_to_terms' => true,
        ])->assertSuccessful();
    }

    $this->postJson('/api/submission', [
        'name' => 'Mari Tamm',
        'sector_ids' => [576],
        'agreed_to_terms' => true,
    ])->assertTooManyRequests()->assertHeader('Retry-After');
});

it('stores a submission for the current session', function () {
    $sessionId = Str::random(40);
    $this->withCookie(config('session.cookie'), $sessionId);

    $response = $this->postJson('api/submission', [
        'name' => 'Katrin Saar',
        'sector_ids' => [141, 121, 75],
        'agreed_to_terms' => true,
    ]);

    $response->assertCreated()
        ->assertJson(['data' => ['name' => 'Katrin Saar', 'agreed_to_terms' => true]]);

    expect($response->json('data.sector_ids'))->toEqualCanonicalizing([141, 121, 75]);

    $this->assertDatabaseHas('submissions', [
        'session_id' => $sessionId,
        'name' => 'Katrin Saar',
        'agreed_to_terms' => true,
    ]);

    $submission = Submission::sole();

    $this->assertDatabaseHas('sector_submission', [
        'submission_id' => $submission->id,
        'sector_id' => 141,
    ]);
    $this->assertDatabaseHas('sector_submission', [
        'submission_id' => $submission->id,
        'sector_id' => 121,
    ]);
    $this->assertDatabaseHas('sector_submission', [
        'submission_id' => $submission->id,
        'sector_id' => 75,
    ]);
});

it('returns the stored submission so the form can refill', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('/api/submission', [
        'name' => 'Jaan Kask',
        'sector_ids' => [44, 113],
        'agreed_to_terms' => true,
    ])->assertCreated();

    $response = $this->getJson('/api/submission')->assertOk();

    expect($response->json('data.name'))->toBe('Jaan Kask')
        ->and($response->json('data.agreed_to_terms'))->toBeTrue()
        ->and($response->json('data.sector_ids'))->toEqualCanonicalizing([44, 113]);
});

it('updates the existing submission for the same session', function () {
    $this->withCookie(config('session.cookie'), Str::random(40));

    $this->postJson('/api/submission', [
        'name' => 'Mari Tamm',
        'sector_ids' => [378],
        'agreed_to_terms' => true,
    ])->assertCreated();

    $response = $this->postJson('/api/submission', [
        'name' => 'Katrin Saar',
        'sector_ids' => [29, 111],
        'agreed_to_terms' => true,
    ]);

    $response->assertOk();

    expect(Submission::count())->toBe(1)
        ->and($response->json('data.name'))->toBe('Katrin Saar')
        ->and($response->json('data.sector_ids'))->toEqualCanonicalizing([29, 111]);

    $this->assertDatabaseMissing('sector_submission', [
        'submission_id' => Submission::sole()->id, 'sector_id' => 378,
    ]);
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
