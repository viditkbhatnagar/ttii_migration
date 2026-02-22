<?php

namespace App\Controllers\Centre;

use App\Models\FolderModel;
use App\Models\FileModel;

class FileManager extends CentreBaseController
{
    // public function __construct()
    // {
    //     parent::__construct();
    //      $this->support_chat_model = new Support_chat_model();
    //      $this->users_model = new Users_model();
    // }

    public function index($folderId = null)
    {
        exit;
        $folderModel = new FolderModel();
        $fileModel = new FileModel();
        
        // CHATGPT ANS
        // $folders = $folderModel->where('parent_id', $folderId ?? 0)->findAll();
        // $files = $fileModel->where('folder_id', $folderId ?? 0)->findAll();
        
        // MY VERSION
        $folders = $this->folder_model->get(['parent_id' => $folderId ?? 0], 'id, name')->getResultArray();

        $files = $this->file_model->get(['folder_id'=>$folder_id]??0)->getResultArray();
        echo '<pre>';print_r($folders);exit;

        $this->data['folders'] = $folders;
        $this->data['files'] = $files;
        $this->data['currentFolderId'] = $folderId;
        
        // echo "<pre>";print_r($this->data);die();
        $this->data['page_title'] = 'Chat_support';
        $this->data['page_name'] = 'resource/index';
        return view('Centre/index', $this->data);
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
