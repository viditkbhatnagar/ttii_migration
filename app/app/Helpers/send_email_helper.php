<?php

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

if (!function_exists('send_email')) {
    function send_email($email, $name, $subject, $body)
    {
        $apiKey = trim((string) env('BREVO_API_KEY'));
        if ($apiKey === '') {
            log_message('error', 'Email sending failed: BREVO_API_KEY is not configured.');
            return false;
        }
        $url = 'https://api.brevo.com/v3/smtp/email';

        $data = [
            'sender' => [
                'name' => 'TTII Education',
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
            log_message('info', 'Email sent: ' . print_r($responseData, true));
            
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
