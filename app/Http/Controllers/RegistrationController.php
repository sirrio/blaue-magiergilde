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
            'character_name' => ['required', 'string'],
            'character_url' => ['required', 'string'],
            'tier' => ['required', 'string'],
            'discord_name' => ['required', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        Registration::create($data);

        return back();
    }

    public function update(Request $request, Registration $registration): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:pending,approved,declined'],
        ]);

        $registration->update($data);

        return back();
    }
}
