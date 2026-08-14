<?php

namespace App\Http\Requests;

use App\Models\Sector;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveSubmissionRequest extends FormRequest
{
    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'sector_ids' => ['required', 'array', 'list', 'min:1'],
            'sector_ids.*' => [
                'integer',
                Rule::exists(Sector::class, 'id')->using(
                    fn (Builder $query) => $query->whereNotIn(
                        'id',
                        Sector::query()->select('parent_id')->whereNotNull('parent_id')
                    )
                ),
            ],
            'agreed_to_terms' => ['required', 'accepted'],
        ];
    }
}
