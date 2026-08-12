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
        Schema::create('sectors', function (Blueprint $table) {
            $table->unsignedBigInteger('id');

            // Declared as a statement rather than a ->primary() modifier so it is
            // registered before the self-referencing foreign key below. PostgreSQL
            // adds both with ALTER TABLE, and rejects a foreign key whose referenced
            // column is not yet unique. A fluent modifier is appended after the
            // foreign key instead, which is the wrong order.
            $table->primary('id');

            $table->foreignId('parent_id')->nullable()->constrained('sectors');
            $table->string('name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sectors');
    }
};
