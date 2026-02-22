<?php
if (!function_exists('encode_file')){
    function encode_file($file_path) {
        return base64_encode($file_path);
    }
}

if (!function_exists('decode_file')){
    function decode_file($file_path) {
        return base64_decode($file_path);
    }
}

if (!function_exists('valid_file')){
    function valid_file($file_path) {
        if (!is_string($file_path) || trim($file_path) === '') {
            return false;
        }

        if (filter_var($file_path, FILTER_VALIDATE_URL)) {
            return false;
        }

        $normalizedPath = str_replace('\\', '/', trim($file_path));
        $normalizedPath = ltrim($normalizedPath, '/');

        if (strpos($normalizedPath, '..') !== false || strpos($normalizedPath, "\0") !== false) {
            return false;
        }

        if (
            strpos($normalizedPath, 'uploads/') !== 0 &&
            strpos($normalizedPath, 'assets/') !== 0
        ) {
            return false;
        }

        $realPath = realpath(FCPATH . $normalizedPath);
        if ($realPath === false || !is_file($realPath)) {
            return false;
        }

        $allowedRoot = realpath(FCPATH);
        return $allowedRoot !== false && strpos($realPath, $allowedRoot . DIRECTORY_SEPARATOR) === 0;
    }
}

if (!function_exists('get_file_url')){
    function get_file($file_path) {
        if (!is_string($file_path) || trim($file_path) === '') {
            return '';
        }

        if (filter_var($file_path, FILTER_VALIDATE_URL)) {
            return $file_path;
        }

        $normalizedPath = str_replace('\\', '/', trim($file_path));
        $normalizedPath = ltrim($normalizedPath, '/');

        if (strpos($normalizedPath, '..') !== false || strpos($normalizedPath, "\0") !== false) {
            return '';
        }

        if (
            strpos($normalizedPath, 'uploads/') !== 0 &&
            strpos($normalizedPath, 'assets/') !== 0
        ) {
            return '';
        }

        return $normalizedPath;
    }
}
