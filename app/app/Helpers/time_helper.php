<?php
// Private helper function

if (!function_exists('time_elapsed_string')) {
    function time_elapsed_string($datetime) {
        $time = strtotime($datetime);
        $now = time();
        $ago = $now - $time;

        $periods = array("second", "minute", "hour", "day", "week", "month", "year", "decade");
        $lengths = array("60", "60", "24", "7", "4.35", "12", "10");

        if ($ago < 0) {
            return 'Just now';
        }

        for ($j = 0; $ago >= $lengths[$j] && $j < count($lengths) - 1; $j++) {
            $ago /= $lengths[$j];
        }

        $ago = round($ago);

        if ($ago == 0) {
            return 'Just now';
        } elseif ($ago == 1) {
            return '1 ' . $periods[$j] . ' ago';
        } else {
            return $ago . ' ' . $periods[$j] . 's ago';
        }
    }
}


function format_time($time_taken) {
    // Parse the time string into seconds
    $seconds = strtotime($time_taken) - strtotime('TODAY');
    
    // Calculate hours, minutes, and seconds
    $hours = floor($seconds / 3600);
    $minutes = floor(($seconds % 3600) / 60);
    $seconds = $seconds % 60;
    
    // Format the output
    $output = '';
    
    if ($hours > 0) {
        $output .= $hours . ' Hr ';
    }
    if ($minutes > 0) {
        $output .= $minutes . ' Min ';
    }
    if ($seconds > 0) {
        $output .= $seconds . ' Sec';
    }
    
    // Trim any extra spaces
    return trim($output);
}
