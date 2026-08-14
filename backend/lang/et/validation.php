<?php

/*
 * Only the rules this application actually uses are translated. Laravel falls
 * back to `fallback_locale` for anything missing, so adding a rule without an
 * Estonian line degrades to English rather than to a raw translation key.
 */
return [

    'accepted' => 'Väli :attribute tuleb aktsepteerida.',
    'array' => 'Väli :attribute peab olema massiiv.',
    'exists' => 'Valitud :attribute on vigane.',
    'integer' => 'Väli :attribute peab olema täisarv.',
    'list' => 'Väli :attribute peab olema loend.',
    'required' => 'Väli :attribute on kohustuslik.',
    'string' => 'Väli :attribute peab olema tekst.',

    'max' => [
        'string' => 'Väli :attribute ei tohi olla pikem kui :max tähemärki.',
    ],

    'min' => [
        'array' => 'Väli :attribute peab sisaldama vähemalt :min elementi.',
    ],

    'attributes' => [
        'name' => 'nimi',
        'sector_ids' => 'sektorid',
        'sector_ids.*' => 'sektor',
        'agreed_to_terms' => 'tingimustega nõustumine',
    ],

];
