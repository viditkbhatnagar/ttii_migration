<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use Google_Client;

class UserAuthentication extends Controller
{
    public function googleLogin()
    {
        $client = new Google_Client();
        $client->setClientId('835914423818-46q08h8fjv33jbmga1kkg3vksv4ofs2p.apps.googleusercontent.com');
        $client->setClientSecret('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');
        $client->setRedirectUri('http://example.com/auth/google/callback');
        $client->addScope('email');
        $client->addScope('profile');

        return redirect()->to($client->createAuthUrl());
    }

    public function googleCallback()
    {
        $client = new Google_Client();
        $client->setClientId('835914423818-46q08h8fjv33jbmga1kkg3vksv4ofs2p.apps.googleusercontent.com');
        $client->setClientSecret('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');
        $client->setRedirectUri('http://example.com/auth/google/callback');

        $code = $this->request->getGet('code');
        $token = $client->fetchAccessTokenWithAuthCode($code);

        if (!isset($token['error'])) {
            // Token acquired successfully, fetch user data
            $googleUser = $client->verifyIdToken();

            // You can now use $googleUser to access user data
            print_r($googleUser);
        } else {
            // Error handling
            echo "Error: " . $token['error'];
        }
    }
}
