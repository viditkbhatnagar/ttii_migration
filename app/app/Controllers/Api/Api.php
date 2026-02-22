<?php
//File: app/Controllers/Api/Api.php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\API\ResponseTrait;

class Api extends BaseController
{
    use ResponseTrait;

    protected $user_data;
    protected $user_id;
    protected $role_id;
    protected $current_role;
    protected $course_id;
    protected $response_data;

    public function __construct()
    {
        helper('auth');
    }
    
     protected function getOrSetCache(string $key, $callback, int $ttl = 600)
    {
        $this->cache = \Config\Services::cache();

        // Check if the data exists in the cache
        $data = $this->cache->get($key);

        if ($data === null) {
            // Cache miss
            if (is_callable($callback)) {
                // If callback is callable, execute it to generate the data
                $data = $callback();
            } elseif (is_array($callback)) {
                // If callback is an array, use it directly
                $data = $callback;
            } else {
                // Invalid callback type
                throw new \InvalidArgumentException('Callback must be callable or an array.');
            }

            // Save the data in the cache
            $this->cache->save($key, $data, $ttl);
        }

        return $data;
    }
    
    protected function setCache(string $key, $callback, int $ttl = 600){
        $this->cache->save($key, $callback, $ttl);
    }

    private function check_auth_token($token){
        $auth_check = decode_auth_token($token);
        if ($auth_check['status']){
            $this->user_data = $auth_check['data'];
            $this->user_id = $auth_check['user_id'];
            $this->role_id = $auth_check['role_id'];
            $this->course_id = $auth_check['course_id'];
        }else{
            $this->user_data = false;
            $this->user_id = false;
            $this->role_id = false;
            $this->course_id = false;
        }
    }

    protected function set_response(){
        return $this->respond($this->response_data, ResponseInterface::HTTP_OK);
    }

    protected function is_valid_request(array $allowedMethods)
    {
        $currentMethod = $this->request->getMethod(true);
        $auth_token = $this->getAuthToken($currentMethod);

        if (!in_array($currentMethod, $allowedMethods)) {
            $this->sendErrorResponse('Method not allowed!', ResponseInterface::HTTP_METHOD_NOT_ALLOWED);
            exit(0);
        }

        if (!$this->is_authenticated($this->request->getPath(), $auth_token)) {
            $this->sendErrorResponse('User not authenticated!', ResponseInterface::HTTP_UNAUTHORIZED);
            exit(0);
        }

        return true;
    }

    private function getAuthToken($method)
    {
        return $method === 'GET' ? $this->request->getGet('auth_token') : $this->request->getPost('auth_token');
    }

    private function sendErrorResponse($message, $statusCode)
    {
        $this->response_data = [
            'status' => false,
            'message' => $message,
            'data' => []
        ];

        $this->response->setStatusCode($statusCode)
            ->setBody(json_encode($this->response_data))
            ->send();
    }

    private function is_authenticated($currentPath, $auth_token=''){
        log_message('error', "https://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]");
        log_message('error', json_encode($_REQUEST));
        
        $public_urls = [
            'api/login/index',
            'api/login/register',
            'api/login/verify_otp',
            'api/category/index',
        ];

        if (!in_array($currentPath, $public_urls)){
            if (empty($auth_token)){
                return false;
            }
            $auth = check_auth_token($auth_token);

            if (!$auth['status']){
                return false;
            }
            $this->user_data = $auth['data']['data'];
            $this->user_id = $this->user_data->user_id;
            $this->role_id = $this->user_data->role_id;
            $this->course_id = $this->user_data->course_id;
            
        }
        return true;

    }

}
