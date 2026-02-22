<?php

use Config\Services;

if (!function_exists('verify_email_real')) {
    /**
     * Verify email using MailboxLayer API
     *
     * @param string $email
     * @param string $apiKey Your MailboxLayer API key
     * @param bool $smtpCheck optional, default true
     * @return array ['is_valid' => bool, 'data' => array]
     */
    function verify_email_real(string $email): array
    {

        $apiKey = '6b8f449c701c3ee11e9a5a2e1bb65937';
        $smtpCheck = true;
        $url = 'http://apilayer.net/api/check';

        try {
            $client = Services::curlrequest();

            $response = $client->get($url, [
                'query' => [
                    'access_key' => $apiKey,
                    'email'      => $email,
                    'smtp'       => $smtpCheck ? 1 : 0,
                    'format'     => 1
                ]
            ]);

            $result = json_decode($response->getBody(), true);

            $isValid = !empty($result['smtp_check']) && $result['smtp_check'] === true;

            return [
                'is_valid' => $isValid,
                'data'     => $result
            ];
        } catch (\Exception $e) {
            return [
                'is_valid' => false,
                'data'     => ['error' => $e->getMessage()]
            ];
        }
    }
}
