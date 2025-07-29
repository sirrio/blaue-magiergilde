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
        $search = request('search');

        $registrationQuery = Registration::query();

        if (! empty($search)) {
            $registrationQuery->where(function ($query) use ($search) {
                $query->where('character_name', 'LIKE', "%{$search}%")
                    ->orWhere('discord_name', 'LIKE', "%{$search}%");
            });
        }

        $registrations = $registrationQuery
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
            'start_tier' => ['required', 'string'],
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
            'character_name' => ['sometimes', 'required', 'string'],
            'character_url' => ['sometimes', 'required', 'string'],
            'start_tier' => ['sometimes', 'required', 'string'],
            'tier' => ['sometimes', 'required', 'string'],
            'discord_name' => ['sometimes', 'required', 'string'],
            'notes' => ['nullable', 'string'],
            'status' => ['sometimes', 'required', 'in:pending,approved,declined'],
        ]);

        $registration->update($data);

        return back();
    }
}
