<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Lab404\Impersonate\Services\ImpersonateManager;

class ImpersonationController extends Controller
{
    public function index(): Response
    {
        $users = User::query()
            ->whereNull('deleted_at')
            ->where('is_admin', false)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'discord_username', 'discord_display_name', 'avatar', 'created_at']);

        return Inertia::render('admin/users', [
            'users' => $users,
        ]);
    }

    public function take(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->canBeImpersonated(), 403);

        /** @var User $admin */
        $admin = $request->user();
        $admin->impersonate($user);

        return redirect()->route('characters.index');
    }

    public function leave(): RedirectResponse
    {
        $manager = app(ImpersonateManager::class);

        if ($manager->isImpersonating()) {
            $manager->leave();
        }

        return redirect()->route('characters.index');
    }
}
