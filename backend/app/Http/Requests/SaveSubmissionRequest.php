<?php

namespace App\Http\Requests;

use App\Models\Sector;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveSubmissionRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'sector_ids' => ['required', 'array', 'list', 'min:1'],
            'sector_ids.*' => [
                'integer',
                'distinct',
                Rule::exists(Sector::class, 'id'),
            ],
            'agreed_to_terms' => ['required', 'accepted'],
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'sector_ids' => 'sectors',
            'sector_ids.*' => 'sector',
            'agreed_to_terms' => 'terms agreement',
        ];
    }
}
