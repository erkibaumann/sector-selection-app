<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    private const SUPPORTED = ['en', 'et'];

    public function handle(Request $request, Closure $next): Response
    {
        App::setLocale($request->getPreferredLanguage(self::SUPPORTED));

        return $next($request);
    }
}
