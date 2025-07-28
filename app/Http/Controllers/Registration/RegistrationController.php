<?php

namespace App\Http\Controllers\Registration;

use App\Http\Controllers\Controller;
use App\Models\Registration;
use App\Models\User;
use App\Models\Character;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RegistrationController extends Controller
{
    public function index(): Response
    {
        $query = Registration::query();

        if ($status = request('status')) {
            $query->where('status', $status);
        }

        if ($tier = request('tier')) {
            $query->where('tier', $tier);
        }

        if ($search = request('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('player_name', 'like', "%$search%")
                    ->orWhere('player_contact', 'like', "%$search%")
                    ->orWhere('external_link', 'like', "%$search%");
            });
        }

        $registrations = $query->orderByDesc('created_at')->paginate();

        return Inertia::render('admin/registrations/index', [
            'filters' => request()->only(['status', 'tier', 'search']),
            'registrations' => $registrations,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/registrations/form');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'player_name' => ['required', 'string'],
            'player_contact' => ['required', 'string'],
            'external_link' => ['required', 'url', 'unique:registrations,external_link'],
            'tier' => ['required', 'string'],
            'notes' => ['nullable', 'string'],
            'user_id' => ['nullable', 'exists:users,id'],
            'character_id' => ['nullable', 'exists:characters,id'],
            'status' => ['sometimes', 'string'],
            'reviewed_by' => ['nullable', 'exists:users,id'],
            'reviewed_at' => ['nullable', 'date'],
        ]);

        Registration::create($data + [
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        return redirect()->route('admin.registrations.index');
    }

    public function edit(Registration $registration): Response
    {
        return Inertia::render('admin/registrations/form', [
            'registration' => $registration,
        ]);
    }

    public function update(Request $request, Registration $registration): RedirectResponse
    {
        $data = $request->validate([
            'player_name' => ['required', 'string'],
            'player_contact' => ['required', 'string'],
            'external_link' => ['required', 'url', "unique:registrations,external_link,{$registration->id}"],
            'tier' => ['required', 'string'],
            'notes' => ['nullable', 'string'],
            'user_id' => ['nullable', 'exists:users,id'],
            'character_id' => ['nullable', 'exists:characters,id'],
            'status' => ['required', 'string'],
            'reviewed_by' => ['nullable', 'exists:users,id'],
            'reviewed_at' => ['nullable', 'date'],
        ]);

        $registration->update($data + [
            'updated_by' => $request->user()->id,
        ]);

        return redirect()->route('admin.registrations.index');
    }
}
