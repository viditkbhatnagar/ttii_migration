<?php

use PHPUnit\Framework\TestCase;

final class AuthResetTokenSmokeTest extends TestCase
{
    protected function setUp(): void
    {
        putenv('RESET_TOKEN_KEY=phase00-test-reset-token-key');
        $_ENV['RESET_TOKEN_KEY'] = 'phase00-test-reset-token-key';
        $_SERVER['RESET_TOKEN_KEY'] = 'phase00-test-reset-token-key';
        helper('password_reset');
    }

    public function testGeneratedTokenIsValidForMatchingUserContext(): void
    {
        $token = generate_password_reset_token(
            17,
            'student@example.com',
            '$2y$10$phase00OriginalPasswordHash'
        );

        $this->assertTrue(
            is_valid_password_reset_token(
                $token,
                17,
                'student@example.com',
                '$2y$10$phase00OriginalPasswordHash'
            )
        );
    }

    public function testGeneratedTokenBecomesInvalidAfterPasswordChange(): void
    {
        $token = generate_password_reset_token(
            17,
            'student@example.com',
            '$2y$10$phase00OriginalPasswordHash'
        );

        $this->assertFalse(
            is_valid_password_reset_token(
                $token,
                17,
                'student@example.com',
                '$2y$10$phase00RotatedPasswordHash'
            )
        );
    }
}
