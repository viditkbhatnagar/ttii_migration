<?php

namespace App\Controllers\Centre;
use App\Controllers\Centre\CentreBaseController;
use App\Models\Support_chat_model;

class Support extends CentreBaseController
{
    
    public function __construct()
    {
        parent::__construct();
         $this->support_chat_model = new Support_chat_model();
    }

    public function index()
    {
        $this->data['page_title'] = 'Support';
        $this->data['page_name']  = 'Support/index';
        return view('Centre/index', $this->data);
    }
    
    public function get_messages(){
        $admin_id  = 1; // or your actual admin id
        $centre_id = get_user_id();
        $messages = $this->support_chat_model->get([
            'OR' => [
                [
                    'sender_id' => $centre_id,
                    'chat_id'   => $admin_id
                ],
                [
                    'sender_id' => $admin_id,
                    'chat_id'   => $centre_id
                ],
            ]
        ], [], )->getResultArray();
        echo json_encode($messages);
    }
    
    public function submit_message(){
        $message = $this->request->getPost('message');
        if (!empty($message)) {
            $data = [
                'chat_id'    => 1,
                'sender_id'  => get_user_id(),
                'message'    => $message,
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
