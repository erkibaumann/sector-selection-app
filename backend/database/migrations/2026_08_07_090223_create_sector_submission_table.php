<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('sector_submission', function (Blueprint $table) {
            $table->foreignId('submission_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sector_id')->constrained();
            $table->unique(['submission_id', 'sector_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sector_submission');
    }
};
