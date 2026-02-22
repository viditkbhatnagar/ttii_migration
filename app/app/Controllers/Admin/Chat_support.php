<?php

namespace App\Controllers\Admin;
use App\Models\Support_chat_model;
use App\Models\Users_model;
class Chat_support extends AppBaseController
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
        $admin_id = get_user_id();
        
        $results = $this->support_chat_model->get([
            'OR' => [
                'sender_id' => $admin_id,
                'chat_id'   => $admin_id
            ]
        ], 'sender_id, chat_id')->getResultArray();

        $chat_user_ids = [];

        foreach ($results as $row) {
            // If admin sent the message → other user is chat_id
            if ($row['sender_id'] == $admin_id) {
                $chat_user_ids[] = $row['chat_id'];
            }
            // If admin received the message → other user is sender_id
            else if ($row['chat_id'] == $admin_id) {
                $chat_user_ids[] = $row['sender_id'];
            }
        }

        // remove duplicates
        $chat_ids = array_values(array_unique($chat_user_ids));

        // $chatted_user_ids = $this->support_chat_model->get([
        //     'OR' => [
        //         'sender_id' => $admin_id,
        //         'chat_id' => $admin_id
        //     ]
        // ], 'DISTINCT(chat_id)')->getResultArray();
        
        // echo "<pre>"; print_r($chat_ids); exit;
        // $chat_ids = array_column($chatted_user_ids, 'chat_id');

        $this->data['users'] = $this->users_model->get([
            'id' => $chat_ids,
            'role_id' => 2,
            'status' => 1
        ])->getResultArray();

        $this->data['centres'] = $this->users_model->get([
            'id' => $chat_ids,
            'role_id' => 7
        ])->getResultArray();

        // $this->data['contacts'] = array_merge(
        //     $this->data['users'],
        //     $this->data['centres']
        // );

        
        // $this->data['messages'] =  $this->support_chat_model->get(['chat_id' => $chat_id])->getResultArray();
        // $this->data['all_users'] =  $this->users_model->get(['role_id' => 2, 'status' =>1])->getResultArray();
        // $this->data['all_centres'] =  $this->users_model->get(['role_id' => 7])->getResultArray();
        $this->data['contacts'] = array_merge(
            $this->users_model->get(['role_id' => 2, 'status' => 1])->getResultArray(),
            $this->users_model->get(['role_id' => 7])->getResultArray()
        );
        
        usort($this->data['contacts'], function ($a, $b) {
            return strcmp($a['name'], $b['name']);
        });

        if($chat_id != 0){
            $this->data['chatuser'] =  $this->users_model->get(['id' => $chat_id])->getRowArray();
        }else{
            $this->data['chatuser'] =  [];
        }
        // echo "<pre>";print_r($this->data);die();
        $tab = $this->request->getGet('tab') ?? 'student'; // 'student' is default if tab not passed
        $this->data['active_tab'] = $tab;
        $this->data['page_title'] = 'Chat_support';
        $this->data['chat_id'] = $chat_id;
        $this->data['page_name'] = 'Chat_support/index';
        return view('Admin/index', $this->data);
    }
    
    
    public function get_messages(){
        $chat_id = $this->request->getGet('chat_id');
        $messages = $this->support_chat_model->get([
            'OR' => [
                [
                    'sender_id' => 1,
                    'chat_id'   => $chat_id
                ],
                [
                    'sender_id' => $chat_id,
                    'chat_id'   => 1
                ],
            ]
        ], [], )->getResultArray();
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
