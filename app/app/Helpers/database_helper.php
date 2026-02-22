<?php

if (!function_exists('get_last_query')){
    function get_last_query() {
        $db = \Config\Database::connect();
        return $db->getLastQuery();
    }
}

if (!function_exists('log_last_query')){
    function log_last_query() {
        log_message('debug', get_last_query());
    }
}