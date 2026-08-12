<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    /**
     * Locales with translations in `lang/`. Anything else falls back to the
     * first entry, which is also the application's fallback locale.
     *
     * @var list<string>
     */
    private const SUPPORTED = ['en', 'et'];

    /**
     * Answers in the language the caller asked for, so a 422 arrives in the
     * language the page is showing rather than the server default.
     */
    public function handle(Request $request, Closure $next): Response
    {
        App::setLocale($request->getPreferredLanguage(self::SUPPORTED));

        return $next($request);
    }
}
