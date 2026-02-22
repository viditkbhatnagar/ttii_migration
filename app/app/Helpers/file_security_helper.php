<?php

if (!function_exists('normalize_relative_file_path')) {
    function normalize_relative_file_path(string $path): string
    {
        $normalized = str_replace('\\', '/', trim($path));
        $normalized = ltrim($normalized, '/');

        if ($normalized === '') {
            return '';
        }

        if (strpos($normalized, '..') !== false || strpos($normalized, "\0") !== false) {
            return '';
        }

        return $normalized;
    }
}

if (!function_exists('resolve_safe_write_file_path')) {
    function resolve_safe_write_file_path(string $relativePath, array $allowedExtensions): string
    {
        $safeRelativePath = normalize_relative_file_path($relativePath);
        if ($safeRelativePath === '') {
            return '';
        }

        $extension = strtolower(pathinfo($safeRelativePath, PATHINFO_EXTENSION));
        if ($extension === '' || !in_array($extension, $allowedExtensions, true)) {
            return '';
        }

        $candidatePath = realpath(WRITEPATH . $safeRelativePath);
        if ($candidatePath === false || !is_file($candidatePath)) {
            return '';
        }

        $writeRoot = realpath(WRITEPATH);
        if ($writeRoot === false || strpos($candidatePath, $writeRoot . DIRECTORY_SEPARATOR) !== 0) {
            return '';
        }

        return $candidatePath;
    }
}
