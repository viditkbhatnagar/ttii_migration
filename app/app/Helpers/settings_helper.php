<?php
// Private helper function
use App\Models\Notification_model;
use App\Models\Enrol_model;

if (!function_exists('get_notifications')) {
    /**
     * Get notifications from the notification table.
     *
     * @param int|null $limit
     * @return array
     */
    function get_notifications(int $limit = null): array
    {
        $model = new Notification_model();
        $course_ids = get_user_course_ids();
    
        return [];
        // $builder = $model->builder(); // Get the query builder instance
    
        // $builder->select('*')
        //         ->orderBy('created_at', 'DESC');
    
        // if (!empty($course_ids)) {
        //     $builder->groupStart()
        //             ->whereIn('course_id', $course_ids)
        //             ->orWhere('course_id', 0)
        //             ->groupEnd();
        // } else {
        //     $builder->where('course_id', 0);
        // }
    
        // if ($limit !== null) {
        //     $builder->limit($limit);
        // }
    
        // return $builder->get()->getResultArray();
    }

}

if (!function_exists('get_user_course_ids')) {
    /**
     * Get enrolled course IDs for the current user.
     *
     * @return array
     */
    function get_user_course_ids(): array
    {
        $user_id = get_user_id();
        $enrolModel = new Enrol_model();

        $results = $enrolModel->get(['user_id' => $user_id], ['course_id'])
                              ->getResultArray();

        return array_column($results, 'course_id');
    }
}

if (!function_exists('get_settings')) {
    function get_settings($item) {
        $db = \Config\Database::connect();
        $query = $db->table('settings')->getWhere(['key' => $item]);
        $result = $query->getRow();

        if ($result) {
            return $result->value ?? '';
        }else{
            return '';
        }
    }
}
if (!function_exists('get_frontend_settings')) {
    function get_frontend_settings($item) {
        $db = \Config\Database::connect();
        $query = $db->table('frontend_settings')->getWhere(['key' => $item]);
        $result = $query->getRow();

        if ($result) {
            return $result->value ?? '';
        }else{
            return '';
        }
    }
}


if (!function_exists('get_site_title')){
    function get_site_title() {
        $site_title = _get_session_value('system_title');
        if (empty($site_title)){
            $site_title = get_settings('system_title');
        }
        if (empty($site_title)){
            return 'TROGON CRM';
        }else{
            return $site_title;
        }
    }
}


if (!function_exists('get_site_logo')){
    function get_site_logo() {
        $site_logo = _get_session_value('site_logo');
        if (empty($site_logo)){
            $site_logo = get_frontend_settings('site_logo');
        }
        return $site_logo;
    }
}

if ( ! function_exists('themeConfiguration'))
{
    function themeConfiguration($theme, $key = "")
    {
        $themeConfigs = [];
        if (file_exists('assets/frontend/'.$theme.'/config/theme-config.json')) {
            $themeConfigs = file_get_contents('assets/frontend/'.$theme.'/config/theme-config.json');
            $themeConfigs = json_decode($themeConfigs, true);
            if ($key != "") {
                if (array_key_exists($key, $themeConfigs)) {
                    return $themeConfigs[$key];
                } else {
                    return false;
                }
            }else {
                return $themeConfigs;
            }
        } else {
            return false;
        }
    }
}

if ( ! function_exists('cleanHTMLText'))
{
    function cleanHTMLText($text) {
        // Replace &nbsp; and <br> with an empty string
        $cleaned_text = str_replace(['&nbsp;', '<br>'], '', $text);
        return trim($cleaned_text);
    }
}

// jwt token
if (!function_exists('call_jwt_api')) {
    function call_jwt_api($meeting_number, $key, $secret) {
        $url = "https://project.trogon.info/zoom_jwt/index.php?meeting_number={$meeting_number}&key={$key}&secret={$secret}";

        // $postData = [
        //     'meeting_number' => $meeting_number,
        //     'key' => $key,
        //     'secret' => $secret
        // ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Remove this line in production

        $response = curl_exec($ch);
        if (curl_errno($ch)) {
            return [
                'status' => 0,
                'message' => 'cURL Error: ' . curl_error($ch)
            ];
        }
        curl_close($ch);

        return json_decode($response, true);
    }
}




    function sendNotification($title, $body, $tokens) {
        $url = 'https://project.trogon.info/firebase/ttii/send-notification.php';
    
        $data = [
            'title' => $title,
            'body' => $body,
            'tokens' => $tokens
        ];
    
        // Debugging: Log the data being sent
        log_message("error", "Sending data: " . print_r($data, true));
    
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    
        $response = curl_exec($ch);
    
        // Debugging: Log the response
        log_message("error", "Response after curl: " . print_r($response, true));
        log_message("error", "curl ## : " . print_r($ch, true));
    
        if (curl_errno($ch)) {
            log_message("error", "cURL error: " . curl_error($ch));
        } else {
            // Optional: Log the successful response
            log_message("error", "cURL success response: " . $response);
        }
    
        curl_close($ch);
    }

