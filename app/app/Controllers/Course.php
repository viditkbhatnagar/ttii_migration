<?php

namespace App\Controllers;

use CodeIgniter\Controller;

class VK_Course extends Controller
{
    public function index()
    {
        return view('course_form');
    }

    public function generate()
    {
        $title = $this->request->getPost('title');
        $apiKey = trim((string) env('OPENAI_API_KEY'));

        if (!$title) return $this->response->setJSON(['error' => 'No course title provided']);
        if ($apiKey === '') return $this->response->setJSON(['error' => 'OpenAI API key is not configured']);

        $response = $this->callOpenAI($title, $apiKey);
        if (isset($response['error'])) return $this->response->setJSON($response);

        $content = $response['content'];
        $cleanedData = $this->extractSections($content);
        return $this->response->setJSON($cleanedData);
    }

    private function callOpenAI($title, $apiKey)
    {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => "https://api.openai.com/v1/chat/completions",
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer $apiKey",
                "Content-Type: application/json"
            ],
            CURLOPT_POSTFIELDS => json_encode([
                'model' => 'gpt-3.5-turbo',
                'messages' => [[
                    'role' => 'user',
                    'content' => "Create a course titled '$title' with: 1. Short Description 2. Outcomes 3. Requirements 4. Course Description"
                ]]
            ]),
        ]);

        $response = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) return ['error' => "Curl Error: $error"];
        
        $decoded = json_decode($response, true);
        return $decoded['choices'][0]['message'] ?? ['error' => 'Invalid AI response'];
    }

    private function extractSections($content) 
{
    // Remove all text from start of line up to (and including) the first colon
    $cleanedContent = preg_replace('/^[^:]+:\s*/m', '', $content);
    
    // Split into sections by line breaks and filter empty lines
    $sections = array_values(array_filter(
        explode("\n", $cleanedContent),
        'trim'
    ));

    return [
        'short_description'  => $sections[0] ?? '',
        'outcomes'           => $sections[1] ?? '',
        'requirements'       => $sections[2] ?? '',
        'course_description' => $sections[3] ?? ''
    ];
}
}
