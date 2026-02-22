<?php
// Private helper function

if (!function_exists('get_duration_by_dates')){
    function get_duration_by_dates($start_time,$end_time) {
        $end_timestamp = strtotime($end_time);
        $start_timestamp = strtotime($start_time);
        $difference_in_seconds = $end_timestamp - $start_timestamp;
        return $difference_in_seconds;
    }
}


if (!function_exists('get_duration_by_seconds')){
    function get_duration_by_seconds($seconds) {
        // Calculate hours, minutes, and seconds
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        $seconds = $seconds % 60;
        
        // Format the duration
        $duration = sprintf("%02d:%02d:%02d", $hours, $minutes, $seconds);
        return $duration;
    }
}



if (!function_exists('formatDuration')){
    function formatDuration($duration) {
        $years = intdiv($duration, 12); // Get the number of full years
        $months = $duration % 12;       // Get the remaining months
    
        $result = '';
    
        if ($years > 0) {
            $result .= $years . ' Year' . ($years > 1 ? 's' : '');
        }
    
        if ($months > 0) {
            $result .= ($years > 0 ? ' ' : '') . $months . ' Month' . ($months > 1 ? 's' : '');
        }
    
        // If there are no years and no months, return '0 Months'
        return $result ?: '0 Months';
    }
}