<?php
namespace App\Controllers;

use CodeIgniter\Controller;

class VK_quiz extends Controller
{
    private $openaiKey;

    public function __construct()
    {
        $this->openaiKey = env('OPENAI_API_KEY') ?? die('Add OPENAI_API_KEY to .env');
    }

    public function index()
    {
        return view('quiz_form');
    }

    public function generate()
    {
        $request = service('request');

        $course = $request->getPost('course');
        $subject = $request->getPost('subject');
        $numQuestions = (int) $request->getPost('numQuestions');

        if (!$course || !$subject || !$numQuestions) {
            return $this->response->setJSON([
                'status' => 'error',
                'message' => 'Missing input data.'
            ]);
        }

        // Define the schema for structured output
        $functions = [
            [
                'name' => 'generate_mcqs',
                'description' => "Generate $numQuestions MCQs for $subject ($course).",
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'questions' => [
                            'type' => 'array',
                            'items' => [
                                'type' => 'object',
                                'properties' => [
                                    'question' => ['type' => 'string'],
                                    'options' => [
                                        'type' => 'array',
                                        'items' => ['type' => 'string'],
                                        'minItems' => 4,
                                        'maxItems' => 4
                                    ],
                                    'correct_answer' => [
                                        'type' => 'integer',
                                        'description' => 'Index of the correct option (0-3)'
                                    ]
                                ],
                                'required' => ['question', 'options', 'correct_answer']
                            ]
                        ]
                    ],
                    'required' => ['questions']
                ]
            ]
        ];

        $payload = json_encode([
            'model' => 'gpt-4.1-nano',
            'messages' => [
                [
                    'role' => 'user',
                    'content' => "Generate $numQuestions MCQs about $subject ($course). Return in JSON format."
                ]
            ],
            'functions' => $functions,
            'function_call' => ['name' => 'generate_mcqs'], // Force the model to use the schema
            'temperature' => 0.7
        ]);

        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => 'https://api.openai.com/v1/chat/completions',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->openaiKey
            ]
        ]);

        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);

        if (curl_errno($curl)) {
            return $this->response->setJSON([
                'status' => 'error',
                'message' => 'cURL Error: ' . curl_error($curl)
            ]);
        }
        curl_close($curl);

        if ($httpCode !== 200) {
            return $this->response->setJSON([
                'status' => 'error',
                'message' => "OpenAI Error: $httpCode - $response"
            ]);
        }

        $data = json_decode($response, true);

        // Extract the structured JSON from the function call
        $functionCall = $data['choices'][0]['message']['function_call'] ?? null;
        if (!$functionCall || $functionCall['name'] !== 'generate_mcqs') {
            return $this->response->setJSON([
                'status' => 'error',
                'message' => 'OpenAI did not return structured data.'
            ]);
        }

        $questions = json_decode($functionCall['arguments'], true);

        return $this->response->setJSON([
            'status' => 'success',
            'questions' => $questions['questions'] // Structured array
        ]);
    }
}