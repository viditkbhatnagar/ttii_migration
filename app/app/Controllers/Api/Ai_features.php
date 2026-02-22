<?php 
namespace App\Controllers\Api;

use App\Services\OpenAI_service;
use App\Controllers\Api\Api;

class Ai_features extends Api
{
    /**
     * Instance of the OpenAI service.
     */
    protected $openAI;

    public function __construct()
    {
        header("Access-Control-Allow-Origin: *");
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization");
        $this->openAI = new OpenAI_service();
    }

    /**
     * Get Chat messages
     */
    public function ai_chat_messages(){
        $this->is_valid_request(['GET']);
        $user_id = $this->user_id;
        $cache_key = 'ai_chat_list_' . $user_id; // user-specific cache key
    
        $result = $this->getOrSetCache($cache_key, [], 10000);
    
        $this->response_data = [
            'status'  => 1,
            'message' => 'Successfully fetched chat messages.',
            'data'    => $result
        ];
    
        return $this->set_response();
    }
    
    /**
     *  Send new chat message
     */
    public function ai_send_message(){
        $this->is_valid_request(['POST']);
        $user_id = $this->user_id;
        $userMessage = $this->request->getPost('message');
        
        $cache_key = 'ai_chat_list_' . $user_id; // user-specific cache key
    
        $chatHistory = $this->getOrSetCache($cache_key, [], 10000);
    
        $assistantResponse = $this->openAI->sendChatMessage($chatHistory, $userMessage, 0.7, $this->user_data);
    
        $chatHistory[] = ['role' => 'user', 'content' => $userMessage];
        $chatHistory[] = ['role' => 'assistant', 'content' => $assistantResponse];
    
        $this->setCache($cache_key, $chatHistory, 10000);
    
        $this->response_data = [
            'status'  => 1,
            'message' => 'Successfully processed chat message.',
            'data'    => [
                'assistant_message' => $assistantResponse,
                'chat_history'      => $chatHistory
            ]
        ];
    
        return $this->set_response();
    }
}

