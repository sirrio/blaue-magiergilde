<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AppearanceController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'appearance' => ['required', 'string'],
        ]);

        return back()->withCookie(cookie('appearance', $data['appearance'], 525600));
    }
}
