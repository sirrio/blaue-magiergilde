<?php

namespace App\Http\Controllers\Character;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

class AvatarMaskController
{
    public function __invoke(Request $request): Response
    {
        $rawPath = trim((string) $request->query('path', ''));
        if ($rawPath === '') {
            abort(404);
        }

        $path = ltrim($rawPath, '/');
        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }

        if (! str_starts_with($path, 'avatars/')) {
            abort(404);
        }

        $disk = Storage::disk('public');
        if (! $disk->exists($path)) {
            abort(404);
        }

        $cacheKey = $path.'|'.$disk->lastModified($path);
        $cachePath = 'avatars/masked/'.sha1($cacheKey).'.png';

        if (! $disk->exists($cachePath)) {
            $contents = $disk->get($path);
            $masked = $this->maskImage($contents);
            if ($masked === null) {
                return response($contents, 200)
                    ->header('Content-Type', $disk->mimeType($path) ?: 'application/octet-stream');
            }
            $disk->put($cachePath, $masked);
        }

        return response($disk->get($cachePath), 200)
            ->header('Content-Type', 'image/png')
            ->header('Cache-Control', 'public, max-age=604800');
    }

    private function maskImage(string $contents): ?string
    {
        if (! function_exists('imagecreatefromstring')) {
            return null;
        }

        $source = @imagecreatefromstring($contents);
        if (! $source) {
            return null;
        }

        $width = imagesx($source);
        $height = imagesy($source);
        $size = min($width, $height);
        if ($size <= 0) {
            imagedestroy($source);

            return null;
        }

        $srcX = (int) floor(($width - $size) / 2);
        $srcY = (int) floor(($height - $size) / 2);

        $canvas = imagecreatetruecolor($size, $size);
        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);
        $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
        imagefill($canvas, 0, 0, $transparent);

        imagecopyresampled(
            $canvas,
            $source,
            0,
            0,
            $srcX,
            $srcY,
            $size,
            $size,
            $size,
            $size
        );

        $mask = imagecreatetruecolor($size, $size);
        imagealphablending($mask, false);
        imagesavealpha($mask, true);
        $maskTransparent = imagecolorallocatealpha($mask, 0, 0, 0, 127);
        imagefill($mask, 0, 0, $maskTransparent);
        $maskSolid = imagecolorallocatealpha($mask, 0, 0, 0, 0);
        imagefilledellipse($mask, (int) ($size / 2), (int) ($size / 2), $size, $size, $maskSolid);

        for ($x = 0; $x < $size; $x++) {
            for ($y = 0; $y < $size; $y++) {
                $alpha = (imagecolorat($mask, $x, $y) >> 24) & 0x7F;
                if ($alpha === 127) {
                    imagesetpixel($canvas, $x, $y, $transparent);
                }
            }
        }

        ob_start();
        imagepng($canvas);
        $output = ob_get_clean();

        imagedestroy($mask);
        imagedestroy($canvas);
        imagedestroy($source);

        return $output === false ? null : $output;
    }
}
