<?php

if (!function_exists('get_image_url')) {
    function get_image_url($image_id)
    {
        $db = \Config\Database::connect();
        $builder = $db->table('frontend_settings');
        $query = $builder->getWhere(['id' => $image_id]);
        $row = $query->getRowArray();

        if ($row) {
            return base_url(get_file($row['value']));
        }

        return null;
    }
}

if (!function_exists('get_settings')) {
    function get_settings($key)
    {
        $db = \Config\Database::connect();
        $builder = $db->table('settings');
        $query = $builder->getWhere(['key' => $key]);
        $row = $query->getRowArray();

        if ($row) {
            return $row['value'];
        }

        return null;
    }
}

if (!function_exists('get_primary_course_id')) {
    function get_primary_course_id()
    {
        $user_id = get_user_id();
        $db = \Config\Database::connect();
        $builder = $db->table('users');
        $query = $builder->getWhere(['id' => $user_id]);
        $row = $query->getRowArray();

        if ($row) {
            return $row['course_id'];
        }

        return null;
    }
}



if (!function_exists('get_time')) {
    function get_time($time_taken)
    {
        // Split the time into hours, minutes, and seconds
        list($hours, $minutes, $seconds) = explode(':', $time_taken);
        
        // Convert to integers to remove any leading zeros
        $hours = (int)$hours;
        $minutes = (int)$minutes;
        $seconds = (int)$seconds;
        
        // Initialize the formatted time string
        $formatted_time = '';
        
        // Append hours if they exist
        if ($hours > 0) {
            $formatted_time .= $hours . 'h ';
        }
        
        // Append minutes if they exist
        if ($minutes > 0) {
            $formatted_time .= $minutes . 'm ';
        }
        
        // Append seconds if they exist
        if ($seconds > 0) {
            $formatted_time .= $seconds . 's';
        }
        
        // Trim any trailing space
        $formatted_time = trim($formatted_time);
        
        // Output the result
        return $formatted_time;

    }
    if (!function_exists('get_centre_name')) {
        function get_centre_name()
        {
            $session = session();

            // 1. Try to get from session first
            if ($session->has('centre_name') && $session->has('centre_id') && $session->has('centre_db_id')) {
                return [
                    'centre_db_id' => $session->get('centre_db_id'),
                    'centre_name' => $session->get('centre_name'),
                    'centre_id'   => $session->get('centre_id'),
                ];
            }

            // 2. Fallback: get from database
            $user_id = get_user_id();

            if (empty($user_id)) {
                return null; // Important safety guard
            }
            

            $db = \Config\Database::connect();

            $user_data = $db->table('users')
                ->select('centre_id')
                ->where('id', $user_id)
                ->get()
                ->getRowArray();

            $centre = $db->table('centres')
                ->select('id,centre_id, centre_name')
                ->where('id', $user_data['centre_id'])
                ->get()
                ->getRowArray();

            // 3. If centre found, set session and return
            if (!empty($centre)) {
                $session->set('centre_db_id', $centre['id']);
                $session->set('centre_name', $centre['centre_name']);
                $session->set('centre_id', $centre['centre_id']);

                return [
                    'centre_db_id'          => $centre['id'],
                    'centre_name' => $centre['centre_name'],
                    'centre_id'   => $centre['centre_id'],
                ];
            }

            // 4. Final fallback – avoid error
            return null;
        }
    }

}

 
 