<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'application' => config('app.name'),
        'surface' => 'api',
        'version' => 'v1',
    ]);
});
