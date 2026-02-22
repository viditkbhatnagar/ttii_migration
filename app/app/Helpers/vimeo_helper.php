<?php

// if (!function_exists('get_vimeo_file_url')) {
//     function get_vimeo_file_url($vimeo_url) {
    
    
//         if (preg_match('/vimeo\.com\/(\d+)/', $vimeo_url, $matches)) {
//             $vimeoVideoId = $matches[1];
//         } else {
//             return [
//                 'status' => 'false',
//                 'message' => 'Invalid Vimeo URL',
//                 'video_link' => null
//             ];
//         }
    
//         $vimeoApiUrl = "https://api.vimeo.com/videos/$vimeoVideoId";
    
//         $ch = curl_init();
//         curl_setopt($ch, CURLOPT_URL, $vimeoApiUrl);
//         curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
//         curl_setopt($ch, CURLOPT_HTTPHEADER, array(
//             "Authorization: Bearer $accessToken"
//         ));
//         $response = curl_exec($ch);
//         log_message('error', 'response : '. print_r($response,true));
//         curl_close($ch);
    
//         $videoInfo = json_decode($response, true);
        
//         $files      = [];
//         $downloads  = [];
    
//         if (isset($videoInfo['files'])) 
//         {
//             $files      =   $videoInfo['files'];
//             $downloads  =   $videoInfo['download'];
            
            
//             return [
//                 'status' => 'false',
//                 'message' => 'Detailed fetched for this video',
//                 'files' => $files,
//                 'downloads' => $downloads
//             ];
//         } 
//         else 
//         {
//             return [
//                 'status' => 'false',
//                 'message' => 'Error fetching video details or invalid video ID',
//                 'files' => $files,
//                 'downloads' => $downloads
//             ];
//         }
//     }
// }



// if (!function_exists('get_vimeo_file_url')) {
//     function get_vimeo_file_url($vimeo_url) {
//         // Use a configured token from environment/settings.
    
//         if (preg_match('/vimeo\.com\/(\d+)/', $vimeo_url, $matches)) {
//             $vimeoVideoId = $matches[1];
//         } else {
//             return [
//                 'status' => false,
//                 'message' => 'Invalid Vimeo URL',
//                 'video_link' => null
//             ];
//         }
    
//         // Use the correct endpoint for video files
//         $vimeoApiUrl = "https://api.vimeo.com/videos/$vimeoVideoId?fields=files,download";
    
//         $ch = curl_init();
//         curl_setopt($ch, CURLOPT_URL, $vimeoApiUrl);
//         curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
//         curl_setopt($ch, CURLOPT_HTTPHEADER, [
//             "Authorization: Bearer $accessToken",
//             "Accept: application/vnd.vimeo.*+json;version=3.4"
//         ]);
//         $response = curl_exec($ch);
//         log_message('error', 'Vimeo API response: '. print_r($response, true));
        
//         if (curl_errno($ch)) {
//             log_message('error', 'Vimeo API error: '. curl_error($ch));
//             return [
//                 'status' => false,
//                 'message' => 'API request failed: '. curl_error($ch),
//                 'video_link' => null
//             ];
//         }
        
//         $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
//         curl_close($ch);
    
//         if ($httpCode !== 200) {
//             return [
//                 'status' => false,
//                 'message' => 'Vimeo API returned HTTP code: '.$httpCode,
//                 'video_link' => null
//             ];
//         }
    
//         $videoInfo = json_decode($response, true);
        
//         if (isset($videoInfo['files']) || isset($videoInfo['download'])) {
//             return [
//                 'status' => true,
//                 'message' => 'Details fetched for this video',
//                 'files' => $videoInfo['files'] ?? [],
//                 'downloads' => $videoInfo['download'] ?? []
//             ];
//         } 
        
//         return [
//             'status' => false,
//             'message' => 'No video files found in response',
//             'files' => [],
//             'downloads' => []
//         ];
//     }
// }


if (!function_exists('get_vimeo_file_url')) {
    function get_vimeo_file_url($vimeo_url)
    {
        $vimeo_access_token = get_settings('vimeo_access_token');
        $vimeo_access_token_2 = get_settings('vimeo_access_token_2');


        // Two access tokens — primary and fallback
        $accessTokens = [
            $vimeo_access_token, // Primary (working one)
            $vimeo_access_token_2  // Secondary (new one)
        ];

        if (preg_match('/vimeo\.com\/(\d+)/', $vimeo_url, $matches)) {
            $vimeoVideoId = $matches[1];
        } else {
            return [
                'status' => false,
                'message' => 'Invalid Vimeo URL',
                'video_link' => null
            ];
        }

        $vimeoApiUrl = "https://api.vimeo.com/videos/$vimeoVideoId?fields=files,download";

        foreach ($accessTokens as $accessToken) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $vimeoApiUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                "Authorization: Bearer $accessToken",
                "Accept: application/vnd.vimeo.*+json;version=3.4"
            ]);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            // Log API response for debugging
            log_message('error', 'Vimeo API response using token ' . substr($accessToken, 0, 6) . '***: ' . print_r($response, true));

            // Handle CURL errors
            if (!empty($curlError)) {
                log_message('error', 'Vimeo API CURL error: ' . $curlError);
                continue; // Try next token
            }

            // Handle non-200 responses
            if ($httpCode !== 200) {
                log_message('error', 'Vimeo API HTTP code: ' . $httpCode . ' for token ' . substr($accessToken, 0, 6));
                continue; // Try next token
            }

            $videoInfo = json_decode($response, true);

            if (!empty($videoInfo['files']) || !empty($videoInfo['download'])) {
                // Found valid data, return success
                return [
                    'status' => true,
                    'message' => 'Video details fetched successfully',
                    'files' => $videoInfo['files'] ?? [],
                    'downloads' => $videoInfo['download'] ?? [],
                    'used_token' => substr($accessToken, 0, 6) . '***',
                ];
            }
        }

        // If all tokens failed
        return [
            'status' => false,
            'message' => 'Failed to fetch Vimeo video details with all tokens',
            'files' => [],
            'downloads' => []
        ];
    }
}



if (!function_exists('process_vimeo_links_for_lesson_file')) {
    function process_vimeo_links_for_lesson_file($lesson_file_id) {
        // Get lesson file details
        $lesson_file_model = new \App\Models\Lesson_file_model();
        $lesson_file = $lesson_file_model->get(['id' => $lesson_file_id])->getRowArray();
        
        if (!$lesson_file) {
            return [
                'status' => false,
                'message' => 'Lesson file not found'
            ];
        }
        
        // Check if it's a Vimeo video
        if ($lesson_file['lesson_provider'] !== 'vimeo' || empty($lesson_file['video_url'])) {
            return [
                'status' => false,
                'message' => 'Not a Vimeo video or no video URL'
            ];
        }
        
        // Get Vimeo video details
        $video_details = get_vimeo_file_url($lesson_file['video_url']);
        
        if (!$video_details['status']) {
            return [
                'status' => false,
                'message' => 'Failed to fetch Vimeo details: ' . $video_details['message']
            ];
        }
        
        $files = $video_details['files'] ?? [];
        if (empty($files)) {
            return [
                'status' => false,
                'message' => 'No video files found'
            ];
        }
        
        // Insert into database
        $vimeo_videolinks_model = new \App\Models\Vimeo_videolinks_model();
        $inserted_count = 0;
        
        foreach ($files as $file) {
            $data = [
                'lesson_file_id' => $lesson_file_id,
                'quality' => $file['quality'] ?? null,
                'rendition' => $file['rendition'] ?? null,
                'height' => $file['height'] ?? null,
                'width' => $file['width'] ?? null,
                'type' => $file['type'] ?? null,
                'link' => $file['link'] ?? null,
                'fps' => $file['fps'] ?? null,
                'size' => $file['size'] ?? null,
                'public_name' => $file['public_name'] ?? null,
                'size_short' => $file['size_short'] ?? null,
                'download_link' => $file['link'] ?? null,
                'created_by' => 1, // Default admin user
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ];
            
            if ($vimeo_videolinks_model->add($data)) {
                $inserted_count++;
            }
        }
        
        return [
            'status' => $inserted_count > 0,
            'message' => $inserted_count > 0 ? "Successfully stored $inserted_count video links" : "Failed to store video links",
            'count' => $inserted_count
        ];
    }
}
