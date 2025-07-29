<?php

namespace App\Http\Controllers;

use App\Models\Registration;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
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
            'start_tier' => ['required', Rule::in(['bt', 'lt', 'ht'])],
            'tier' => ['required', Rule::in(['bt', 'lt', 'ht', 'et'])],
            'discord_name' => ['required', 'string'],
            'discord_id' => ['nullable', 'integer'],
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
            'tier' => ['sometimes', 'required', Rule::in(['bt', 'lt', 'ht', 'et'])],
            'notes' => ['nullable', 'string'],
            'status' => ['sometimes', 'required', 'in:pending,approved,declined'],
        ]);

        $registration->update($data);

        return back();
    }
}
