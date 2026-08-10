<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SaveSubmissionRequest;
use App\Http\Resources\SubmissionResource;
use App\Models\Submission;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class SubmissionController extends Controller
{
    public function show(Request $request): SubmissionResource|Response
    {
        $submission = Submission::query()
            ->with('sectors:id')
            ->firstWhere('session_id', $request->session()->getId());

        return $submission === null
            ? response()->noContent()
            : new SubmissionResource($submission);
    }

    public function store(SaveSubmissionRequest $request): SubmissionResource
    {
        $validated = $request->validated();

        $submission = DB::transaction(function () use ($request, $validated): Submission {
            $submission = Submission::query()->updateOrCreate(
                ['session_id' => $request->session()->getId()],
                ['name' => $validated['name'], 'agreed_to_terms' => true]
            );

            $submission->sectors()->sync($validated['sector_ids']);

            return $submission;
        });

        return new SubmissionResource($submission->load('sectors:id'));
    }
}
