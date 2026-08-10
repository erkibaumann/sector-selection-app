<?php

it('issues an xsrf token cookie so the client can send a csrf header', function () {
    $this->getJson('/api/csrf-cookie')
        ->assertNoContent()
        ->assertCookie('XSRF-TOKEN');
});
