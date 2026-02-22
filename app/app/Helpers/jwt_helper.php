<?php
//File: app/Helpers/jwt_helper.php

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use CodeIgniter\HTTP\RequestInterface;
use Exception;


if (!function_exists('generate_auth_token')) {
    function generate_auth_token($userdata)
    {
        $issued_at = time();
        $expiration_time = $issued_at + 3600000;  // jwt valid for 1 hour from the issued time
        $payload = [
            'iat' => $issued_at,        // Issued at: time when the token was generated
            'jti' => base64_encode(random_bytes(32)), // Json Token Id: an unique identifier for the token
            'iss' => 'TROGON_PROJECTS',    // Issuer
            'nbf' => $issued_at,        // Not before
            'exp' => $expiration_time,  // Expire
            'data' => $userdata        // Data related to the signer user
        ];

        return JWT::encode($payload, JWT_SECRET_KEY, 'HS256');
    }
}

if (!function_exists('decode_auth_token')) {
    function decode_auth_token($token)
    {
        try {
            $decoded = JWT::decode($token, new Key(JWT_SECRET_KEY, 'HS256'));
            return ['status' => true, 'data' => (array) $decoded];
        } catch (Exception $e) {
            // Handle the exception (e.g., token is invalid, expired, etc.)
            return ['status' => false, 'error' => $e->getMessage()];
        }
    }
}

if (!function_exists('check_auth_token')) {
    function check_auth_token($token)
    {
        return decode_auth_token($token);
    }
}