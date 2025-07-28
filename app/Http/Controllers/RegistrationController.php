<?php

namespace App\Http\Controllers;

use App\Models\Registration;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RegistrationController extends Controller
{
    public function index(): Response
    {
        $registrations = Registration::query()
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('registration/list', [
            'registrations' => $registrations,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'link' => ['required', 'string'],
            'tier' => ['required', 'string'],
        ]);

        Registration::create($data);

        return back();
    }

    public function update(Request $request, Registration $registration): RedirectResponse
    {
        $data = $request->validate([
            'user_id' => ['nullable', 'exists:users,id'],
            'character_id' => ['nullable', 'exists:characters,id'],
            'approved_at' => ['nullable', 'date'],
        ]);

        $registration->update($data);

        return back();
    }
}
