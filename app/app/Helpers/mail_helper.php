<?php
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

if (!function_exists('send_email_message')) {
    function send_email_message($email, $name, $subject, $body, $sender_name = 'TTII Education')
    {
        $apiKey = trim((string) env('BREVO_API_KEY'));
        if ($apiKey === '') {
            log_message('error', 'Email sending failed: BREVO_API_KEY is not configured.');
            return false;
        }
        $url = 'https://api.brevo.com/v3/smtp/email';

        $data = [
            'sender' => [
                'name' => $sender_name,
                'email' => 'info@teachersindia.in',
            ],
            'to' => [
                [
                    'email' => $email,
                    'name' => $name
                ]
            ],
            'subject' => $subject,
            'htmlContent' => $body,
        ];

        try {
            $client = new Client();
            $response = $client->post($url, [
                'headers' => [
                    'accept' => 'application/json',
                    'api-key' => $apiKey,
                    'content-type' => 'application/json',
                ],
                'json' => $data,
            ]);

            $responseData = json_decode($response->getBody(), true);
            
            // Log success or handle response
            log_message('error', 'Email sent: ' . print_r($responseData, true));
            
            return true;
            
        } catch (RequestException $e) {
            // Log the error
            log_message('error', 'Email sending failed: ' . $e->getMessage());
            
            if ($e->hasResponse()) {
                $response = $e->getResponse();
                $responseBody = $response->getBody()->getContents();
                log_message('error', 'Brevo API response: ' . $responseBody);
            }
            
            return false;
        }
    }
}

// if (!function_exists('send_email_message')) {
//     function send_email_message($toEmail, $toName, $subject, $bodyContent, $senderName)
//     {
//         // API endpoint URL
//         $url = 'https://project.ecopen.info/brevo_mail/index.php';
        
//         // Data to be sent to the external API
//         $data = [
//             'toEmail' => $toEmail,
//             'toName' => $toName,
//             'subject' => $subject,
//             'bodyContent' => $bodyContent,
//             'senderName' => $senderName
//         ];

//         // Initialize cURL
//         $ch = curl_init();

//         // Set cURL options
//         curl_setopt($ch, CURLOPT_URL, $url);
//         curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
//         curl_setopt($ch, CURLOPT_POST, true);
//         curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data)); // Send data as POST

//         // Execute cURL request
//         $response = curl_exec($ch);
//         // Log the response for debugging
//         log_message('error', 'Brevo response: '.print_r($response, true));
//         // Check for cURL errors
//         if (curl_errno($ch)) {
//             return ['status' => 'error', 'message' => curl_error($ch)];
//         }

//         // Close cURL
//         curl_close($ch);

//         // Return the response from the external API
//         return json_decode($response, true);
//     }
// }
