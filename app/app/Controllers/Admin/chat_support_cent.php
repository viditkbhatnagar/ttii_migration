<?php

namespace App\Controllers\Admin;
use App\Models\Support_chat_model;
use App\Models\Users_model;
class Chat_support1_cent extends AppBaseController
{
    public function __construct()
    {
        parent::__construct();
         $this->support_chat_model = new Support_chat_model();
         $this->users_model = new Users_model();
    }

    public function index($chat_id = 0)
    {
        if ($this->request->getMethod() === 'post') {
            $message = $this->request->getPost('message');
        
            if (!empty($message)) {
                $data = [
                    'chat_id' => $chat_id,
                    'sender_id' => get_user_id(),
                    'message' => $message,
                    'created_at' => date('Y-m-d H:i:s'),
                    'created_by' => get_user_id(),
                    'updated_at' => date('Y-m-d H:i:s'),
                    'updated_by' => get_user_id(),
                ];
                $response = $this->support_chat_model->add($data);
            }
        }
        $this->data['messages'] =  $this->support_chat_model->get(['chat_id' => $chat_id])->getResultArray();
        $this->data['users'] =  $this->users_model->get(['role_id' => 7, 'status' =>1])->getResultArray();
        if($chat_id != 0){
            $this->data['chatuser'] =  $this->users_model->get(['id' => $chat_id])->getRowArray();
        }else{
            $this->data['chatuser'] =  [];
        }
        echo "<pre>";print_r($this->data);die();
        $this->data['page_title'] = 'Chat_support';
        $this->data['chat_id'] = $chat_id;
        $this->data['page_name'] = 'Chat_support_cent/index';
        return view('Admin/index', $this->data);
    }
    
    
    public function get_messages(){
        $chat_id = $this->request->getGet('chat_id');
        $messages =  $this->support_chat_model->get(['chat_id' => $chat_id])->getResultArray();
        echo json_encode($messages);
    }
     public function submit_message(){
        $message = $this->request->getPost('message');
        if (!empty($message)) {
            $data = [
                'chat_id' => $this->request->getPost('chat_id'),
                'sender_id' => get_user_id(),
                'message' => $message,
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
                'updated_by' => get_user_id(),
            ];
            $response = $this->support_chat_model->add($data);
            if($response){
                $response_data = [
                    'status' => 1,
                    'message' => 'message send successfully'
                ];
                echo json_encode($response_data);
            }else{
                $response_data = [
                    'status' => 0,
                    'message' => 'something went wrong!'
                ];
                echo json_encode($response_data);
            }
        }else{
            $response_data = [
                'status' => 0,
                'message' => 'something went wrong!'
            ];
            echo json_encode($response_data);
        }
    }
    
}
