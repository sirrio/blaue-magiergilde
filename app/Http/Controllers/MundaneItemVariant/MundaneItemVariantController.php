<?php

namespace App\Http\Controllers\MundaneItemVariant;

use App\Http\Controllers\Controller;
use App\Http\Requests\MundaneItemVariant\StoreMundaneItemVariantRequest;
use App\Http\Requests\MundaneItemVariant\UpdateMundaneItemVariantRequest;
use App\Models\CompendiumComment;
use App\Models\MundaneItemVariant;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class MundaneItemVariantController extends Controller
{
    public function index(): \Inertia\Response
    {
        $search = request('search', '');
        $category = request('category', null);
        $guild = request('guild', null);
        $user = request()->user();

        $currentUserId = $user?->id;
        $isAdmin = (bool) $user?->is_admin;
        $query = MundaneItemVariant::query()->with(['comments.user:id,name'])->withCount('comments');
        if (! empty($search)) {
            $query->where('name', 'LIKE', "%{$search}%");
        }
        if (! empty($category)) {
            $query->where('category', $category);
        }
        if ($guild === 'allowed') {
            $query->where('guild_enabled', true);
        } elseif ($guild === 'blocked') {
            $query->where('guild_enabled', false);
        }

        $variants = $query
            ->orderBy('category')
            ->orderBy('is_placeholder', 'desc')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'category', 'cost_gp', 'is_placeholder', 'guild_enabled']);

        return Inertia::render('mundane-item-variant/index', [
            'variants' => Inertia::defer(fn () => $variants->map(fn (MundaneItemVariant $variant) => [
                'id' => $variant->id,
                'name' => $variant->name,
                'slug' => $variant->slug,
                'category' => $variant->category,
                'cost_gp' => $variant->cost_gp,
                'is_placeholder' => (bool) $variant->is_placeholder,
                'guild_enabled' => (bool) $variant->guild_enabled,
                'comments_count' => $variant->comments_count ?? $variant->comments->count(),
                'comments' => $variant->comments->map(fn (CompendiumComment $comment) => [
                    'id' => $comment->id,
                    'body' => $comment->body,
                    'created_at' => $comment->created_at?->toISOString(),
                    'can_delete' => $isAdmin || ($currentUserId !== null && $comment->user_id === $currentUserId),
                    'user' => $comment->user ? [
                        'id' => $comment->user->id,
                        'name' => $comment->user->name,
                    ] : null,
                ])->values(),
            ])->values()),
            'canManage' => $isAdmin,
            'indexRoute' => 'compendium.mundane-item-variants.index',
        ]);
    }

    public function store(StoreMundaneItemVariantRequest $request): RedirectResponse
    {
        $variant = new MundaneItemVariant;
        $variant->name = $request->input('name');
        $variant->slug = $request->input('slug');
        $variant->category = $request->input('category');
        $variant->cost_gp = $request->input('cost_gp');
        $variant->is_placeholder = $request->boolean('is_placeholder', false);
        $variant->guild_enabled = $request->boolean('guild_enabled', true);
        $variant->save();

        return redirect()->back();
    }

    public function update(UpdateMundaneItemVariantRequest $request, MundaneItemVariant $mundaneItemVariant): RedirectResponse
    {
        $mundaneItemVariant->name = $request->input('name');
        $mundaneItemVariant->slug = $request->input('slug');
        $mundaneItemVariant->category = $request->input('category');
        $mundaneItemVariant->cost_gp = $request->input('cost_gp');
        $mundaneItemVariant->is_placeholder = $request->boolean('is_placeholder', false);
        $mundaneItemVariant->guild_enabled = $request->boolean('guild_enabled', true);
        $mundaneItemVariant->save();

        return redirect()->back();
    }

    public function destroy(MundaneItemVariant $mundaneItemVariant): RedirectResponse
    {
        $mundaneItemVariant->delete();

        return redirect()->back();
    }
}
