<?php
function get_app_category($app_name) {
    $logger = service('logger');
    $result = call_api('https://adeeb.in/openai/get_app_category_by_name_base.php',
        ['search_query' => $app_name]
    );
    
    $logger->error('Error checking: ' .print_r($result));
    
    
    if(!empty($app_name))
    {
        
//        return [
//                'app_name' => 'Google Chrome',
//                'app_category' => 3,
//                'productivity_level' => 2,
//            ];
        
        
         $app_name = $result['result'];
        
         $parts = explode(':', $app_name);
    
         if (count($parts) == 3) {
             return [
                 'app_name' => trim($parts[0]),
                 'app_category' => trim($parts[1]),
                 'productivity_level' => trim($parts[2]),
             ];
         }
    }
    else
    {
        return [
                'app_name' => 'Google Chrome',
                'app_category' => 3,
                'productivity_level' => 2,
            ];
    }
    
    
    return false;
}

function call_api($url, $data) {
    $curl = curl_init($url);
    // Convert the array into a URL-encoded query string
    $postData = is_array($data) ? http_build_query($data) : $data;

    curl_setopt_array($curl, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $postData, // Send the URL-encoded string
        CURLOPT_HTTPHEADER => array('Content-Type: application/x-www-form-urlencoded'),
    ));

    $response = curl_exec($curl);

    if (curl_errno($curl)) {
        $error_msg = curl_error($curl);
        curl_close($curl);
        return json_encode(['error' => $error_msg]);
    }

    curl_close($curl);
    return json_decode($response, true);
}

