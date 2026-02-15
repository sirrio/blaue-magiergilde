<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreSourceRequest;
use App\Http\Requests\Admin\UpdateSourceRequest;
use App\Models\Source;
use Illuminate\Http\RedirectResponse;

class SourceController extends Controller
{
    public function store(StoreSourceRequest $request): RedirectResponse
    {
        Source::query()->create($request->validated());

        return redirect()->back();
    }

    public function update(UpdateSourceRequest $request, Source $source): RedirectResponse
    {
        $source->update($request->validated());

        return redirect()->back();
    }

    public function destroy(Source $source): RedirectResponse
    {
        $source->delete();

        return redirect()->back();
    }
}
