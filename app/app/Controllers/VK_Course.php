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

        if (!$title) {
            return $this->response->setJSON(['error' => 'No course title provided']);
        }

        if ($apiKey === '') {
            return $this->response->setJSON(['error' => 'OpenAI API key is not configured']);
        }

        $prompt = "Create a course with the title '$title' and provide the following:
        // 1. Short Description
        // 2. Outcomes
        // 3. Requirements
        // 4. Course Description";

        $data = [
            'model' => 'gpt-3.5-turbo',
            'messages' => [
                ['role' => 'user', 'content' => $prompt]
            ]
        ];

        $ch = curl_init();

        curl_setopt_array($ch, [
            CURLOPT_URL => "https://api.openai.com/v1/chat/completions",
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer $apiKey",
                "Content-Type: application/json"
            ],
            CURLOPT_POSTFIELDS => json_encode($data),
        ]);

        $response = curl_exec($ch);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            return $this->response->setJSON(['error' => "Curl Error: $curlError"]);
        }

        $decoded = json_decode($response, true);
        

        if (!isset($decoded['choices'][0]['message']['content'])) {
            return $this->response->setJSON(['error' => 'Invalid AI response', 'debug' => $response]);
        }

        $content = $decoded['choices'][0]['message']['content'];

        // Log AI response for debugging
        // log_message('debug', "AI Content: " . $content);

        // Simple pattern split
        $sections = preg_split('/\d\.\s/', $content);

        return $this->response->setJSON([
            'short_description'  => trim($sections[1] ?? 'No short description'), 
            'outcomes'           => trim($sections[2] ?? 'No outcomes'),
            'requirements'       => trim($sections[3] ?? 'No requirements'),
            'course_description' => trim($sections[4] ?? 'No description'),
        ]);
    }
}
