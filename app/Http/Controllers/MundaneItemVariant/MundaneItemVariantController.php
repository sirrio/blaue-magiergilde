<?php

namespace App\Http\Controllers\MundaneItemVariant;

use App\Http\Controllers\Controller;
use App\Http\Requests\MundaneItemVariant\StoreMundaneItemVariantRequest;
use App\Http\Requests\MundaneItemVariant\UpdateMundaneItemVariantRequest;
use App\Models\MundaneItemVariant;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class MundaneItemVariantController extends Controller
{
    public function index(): \Inertia\Response
    {
        $search = request('search', '');
        $category = request('category', null);

        $query = MundaneItemVariant::query();
        if (!empty($search)) {
            $query->where('name', 'LIKE', "%{$search}%");
        }
        if (!empty($category)) {
            $query->where('category', $category);
        }

        $variants = $query
            ->orderBy('category')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'category', 'cost_gp', 'is_placeholder', 'sort_order']);

        return Inertia::render('mundane-item-variant/index', [
            'variants' => Inertia::defer(fn () => $variants),
            'canManage' => true,
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
        $variant->sort_order = (int) $request->input('sort_order', 0);
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
        $mundaneItemVariant->sort_order = (int) $request->input('sort_order', 0);
        $mundaneItemVariant->save();
        return redirect()->back();
    }

    public function destroy(MundaneItemVariant $mundaneItemVariant): RedirectResponse
    {
        $mundaneItemVariant->delete();
        return redirect()->back();
    }
}
