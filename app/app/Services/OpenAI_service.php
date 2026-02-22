<?php namespace App\Services;

use CodeIgniter\HTTP\CURLRequest;

class OpenAI_service
{
    protected $apiKey;
    protected $apiUrl = 'https://api.openai.com/v1/chat/completions';
    protected $http;
    protected $ai_tokens_usage_model;
    public function __construct()
    {
        $this->apiKey = get_settings('openai_api_key');
        $this->http = \Config\Services::curlrequest();
    }
    
    /**
     * Send a chat message to OpenAI with conversation history.
     *
     * @param array $history Array of previous chat messages.
     * @param string $userMessage New user message.
     * @param float $temperature (optional) The creativity level.
     * @return string The assistant's response.
     * @throws \Exception if the API call fails.
     */
    public function sendChatMessage(array $history, string $userMessage, float $temperature = 0.7, Object $user_data = null): string
    {
        // Combine the system instruction, existing history, and the new user message.
        $messages = array_merge(
            [['role' => 'system', 'content' => 'You are a helpful assistant engaged in a chat conversation for a student. Please reply in a short and concise manner.']],
            $history,
            [['role' => 'user', 'content' => $userMessage]]
        );

        $payload = [
            'model'       => 'gpt-4o-mini',
            'messages'    => $messages,
            'temperature' => $temperature,
        ];

        $response = $this->http->post($this->apiUrl, [
            'headers' => [
                'Content-Type'  => 'application/json',
                'Authorization' => 'Bearer ' . $this->apiKey,
            ],
            'json' => $payload,
        ]);

        if ($response->getStatusCode() !== 200) {
            throw new \Exception('Error communicating with OpenAI API.');
        }

        $body = json_decode($response->getBody(), true);

        log_message('error', '$body : '. print_r($body ,true));
        return $body['choices'][0]['message']['content'] ?? '';
    }
    
    // public function sendChatMessage(array $history, string $userMessage, float $temperature = 0.7, Object $user_data = null): string
    // {
    //     $messages = array_merge(
    //         [['role' => 'system', 'content' => 'You are a helpful assistant engaged in a chat conversation for a student. Please reply in a short and concise manner.']],
    //         $history,
    //         [['role' => 'user', 'content' => $userMessage]]
    //     );

    //     $payload = [
    //         'model'       => 'gpt-4o-mini',
    //         'messages'    => $messages,
    //         'temperature' => $temperature,
    //     ];

    //     $maxRetries = 3;
    //     $delay = 2; // seconds

    //     for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
    //         $response = $this->http->post($this->apiUrl, [
    //             'headers' => [
    //                 'Content-Type'  => 'application/json',
    //                 'Authorization' => 'Bearer ' . $this->apiKey,
    //             ],
    //             'json' => $payload,
    //         ]);

    //         $statusCode = $response->getStatusCode();

    //         if ($statusCode === 200) {
    //             $body = json_decode($response->getBody(), true);
    //             log_message('debug', '$body: ' . print_r($body, true));
    //             return $body['choices'][0]['message']['content'] ?? '';
    //         }

    //         if ($statusCode === 429) {
    //             log_message('warning', "Rate limited (429). Attempt $attempt of $maxRetries. Retrying in {$delay}s...");
    //             sleep($delay);
    //             $delay *= 2; // Exponential backoff
    //         } else {
    //             // For other errors, no retry
    //             throw new \Exception("Error communicating with OpenAI API. Status: $statusCode");
    //         }
    //     }

    //     throw new \Exception('Exceeded retry attempts due to rate limiting (429).');
    // }


}
