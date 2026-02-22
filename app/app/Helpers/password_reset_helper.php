<?php

if (!function_exists('password_reset_normalize_email')) {
    function password_reset_normalize_email(string $email): string
    {
        return strtolower(trim($email));
    }
}

if (!function_exists('password_reset_signing_key')) {
    function password_reset_signing_key(): string
    {
        $configured = trim((string) env('RESET_TOKEN_KEY'));
        if (
            $configured !== '' &&
            stripos($configured, 'REPLACE_WITH_ROTATED_') !== 0
        ) {
            return $configured;
        }

        $jwtFallback = trim((string) env('JWT_SECRET_KEY'));
        if (
            $jwtFallback !== '' &&
            stripos($jwtFallback, 'REPLACE_WITH_ROTATED_') !== 0
        ) {
            return $jwtFallback;
        }

        return '';
    }
}

if (!function_exists('password_reset_base64url_encode')) {
    function password_reset_base64url_encode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}

if (!function_exists('password_reset_base64url_decode')) {
    function password_reset_base64url_decode(string $value): string
    {
        $remainder = strlen($value) % 4;
        if ($remainder) {
            $value .= str_repeat('=', 4 - $remainder);
        }

        $decoded = base64_decode(strtr($value, '-_', '+/'), true);
        return $decoded === false ? '' : $decoded;
    }
}

if (!function_exists('generate_password_reset_token')) {
    function generate_password_reset_token(int $userId, string $email, string $passwordHash, int $ttlSeconds = 1800): string
    {
        $signingKey = password_reset_signing_key();
        if ($signingKey === '') {
            throw new \RuntimeException('Password reset signing key is not configured');
        }

        $now = time();
        $payload = [
            'uid' => $userId,
            'eh' => hash('sha256', password_reset_normalize_email($email)),
            'iat' => $now,
            'exp' => $now + max(300, $ttlSeconds),
            'pwh' => substr(hash('sha256', (string) $passwordHash), 0, 24),
        ];

        $payloadEncoded = password_reset_base64url_encode(json_encode($payload));
        $signature = hash_hmac('sha256', $payloadEncoded, $signingKey, true);
        $signatureEncoded = password_reset_base64url_encode($signature);

        return $payloadEncoded . '.' . $signatureEncoded;
    }
}

if (!function_exists('is_valid_password_reset_token')) {
    function is_valid_password_reset_token(string $token, int $expectedUserId, string $expectedEmail, string $currentPasswordHash): bool
    {
        $signingKey = password_reset_signing_key();
        if ($signingKey === '') {
            return false;
        }

        if ($token === '' || strpos($token, '.') === false) {
            return false;
        }

        [$payloadEncoded, $signatureEncoded] = explode('.', $token, 2);
        if ($payloadEncoded === '' || $signatureEncoded === '') {
            return false;
        }

        $expectedSignature = password_reset_base64url_encode(
            hash_hmac('sha256', $payloadEncoded, $signingKey, true)
        );

        if (!hash_equals($expectedSignature, $signatureEncoded)) {
            return false;
        }

        $payloadRaw = password_reset_base64url_decode($payloadEncoded);
        if ($payloadRaw === '') {
            return false;
        }

        $payload = json_decode($payloadRaw, true);
        if (!is_array($payload)) {
            return false;
        }

        $tokenUserId = (int) ($payload['uid'] ?? 0);
        $tokenExp = (int) ($payload['exp'] ?? 0);
        $tokenEmailHash = (string) ($payload['eh'] ?? '');
        $tokenPasswordHash = (string) ($payload['pwh'] ?? '');

        if ($tokenUserId !== $expectedUserId) {
            return false;
        }

        if ($tokenExp <= time()) {
            return false;
        }

        if (!hash_equals(hash('sha256', password_reset_normalize_email($expectedEmail)), $tokenEmailHash)) {
            return false;
        }

        $currentPasswordHashDigest = substr(hash('sha256', (string) $currentPasswordHash), 0, 24);
        if (!hash_equals($currentPasswordHashDigest, $tokenPasswordHash)) {
            return false;
        }

        return true;
    }
}
