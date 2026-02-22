<?php
if (!function_exists('alert_danger')) {
    function alert_danger($message, $description = ''){
        echo "<div class=\"alert alert-danger fade show mb-xl-0\" role=\"alert\">
                    <strong>{$message}</strong>
                    <div>{$description}</div>
                </div>";
    }
}

if (!function_exists('alert_warning')) {
    function alert_warning($message, $description = ''){
        echo "<div class=\"alert alert-warning fade show mb-xl-0\" role=\"alert\">
                    <strong>{$message}</strong>
                    <div>{$description}</div>
                </div>";
    }
}

if (!function_exists('alert_info')) {
    function alert_info($message, $description = ''){
        echo "<div class=\"alert alert-info fade show mb-xl-0\" role=\"alert\">
                    <strong>{$message}</strong>
                    <div>{$description}</div>
                </div>";
    }
}

if (!function_exists('alert_primary')) {
    function alert_primary($message, $description = ''){
        echo "<div class=\"alert alert-primary fade show mb-xl-0\" role=\"alert\">
                    <strong>{$message}</strong>
                    <div>{$description}</div>
                </div>";
    }
}

if (!function_exists('alert_success')) {
    function alert_success($message, $description = ''){
        echo "<div class=\"alert alert-success fade show mb-xl-0\" role=\"alert\">
                    <strong>{$message}</strong>
                    <div>{$description}</div>
                </div>";
    }
}

if (!function_exists('alert_danger_dismiss')) {
    function alert_danger_dismiss($message, $description = ''){
        echo "<div class=\"alert alert-danger alert-dismissible fade show mb-xl-0\" role=\"alert\">
                    <strong>{$message}</strong>
                    <div>{$description}</div>
                    <button type=\"button\" class=\"btn-close\" data-bs-dismiss=\"alert\" aria-label=\"Close\"></button>
                </div>";
    }
}

if (!function_exists('alert_warning_dismiss')) {
    function alert_warning_dismiss($message, $description = ''){
        echo "<div class=\"alert alert-warning alert-dismissible fade show mb-xl-0\" role=\"alert\">
                    <strong>{$message}</strong>
                    <div>{$description}</div>
                    <button type=\"button\" class=\"btn-close\" data-bs-dismiss=\"alert\" aria-label=\"Close\"></button>
                </div>";
    }
}

if (!function_exists('alert_info_dismiss')) {
    function alert_info_dismiss($message, $description = ''){
        echo "<div class=\"alert alert-info alert-dismissible fade show mb-xl-0\" role=\"alert\">
                    <strong>{$message}</strong>
                    <div>{$description}</div>
                    <button type=\"button\" class=\"btn-close\" data-bs-dismiss=\"alert\" aria-label=\"Close\"></button>
                </div>";
    }
}

if (!function_exists('alert_primary_dismiss')) {
    function alert_primary_dismiss($message, $description = ''){
        echo "<div class=\"alert alert-primary alert-dismissible fade show mb-xl-0\" role=\"alert\">
                    <strong>{$message}</strong>
                    <div>{$description}</div>
                    <button type=\"button\" class=\"btn-close\" data-bs-dismiss=\"alert\" aria-label=\"Close\"></button>
                </div>";
    }
}

if (!function_exists('alert_success_dismiss')) {
    function alert_success_dismiss($message, $description = ''){
        echo "<div class=\"alert alert-success alert-dismissible fade show mb-xl-0\" role=\"alert\">
                    <strong>{$message}</strong>
                    <div>{$description}</div>
                    <button type=\"button\" class=\"btn-close\" data-bs-dismiss=\"alert\" aria-label=\"Close\"></button>
                </div>";
    }
}