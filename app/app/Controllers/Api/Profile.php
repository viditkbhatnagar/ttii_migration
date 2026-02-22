<?php
//File: app/Controllers/Api/Home.php

namespace App\Controllers\Api;

use App\Controllers\Api\Api;
use App\Models\Users_model;
use App\Models\Notification_model;

class Profile extends Api
{
    private $users_model;
    public function __construct(){
        $this->users_model = new Users_model();
        $this->notification_model = new Notification_model();
    }
    
    
    public function index()
    {
        $this->is_valid_request(['GET']);
        $data = [
                'user_data' => $this->users_model->userdata($this->users_model->get(['id' => $this->user_id])->getRow()),
                'call_us' => get_settings('contact_phone'),
                'whatsapp' => get_settings('contact_whatsapp')
            ];
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $data];
        return $this->set_response();
    }

    public function update(){
        ini_set('memory_limit', '256M');
        $this->is_valid_request(['POST']);
        
        // First verify user is authenticated
        if (!$this->user_id) {
            $this->response_data = [
                'status' => false,
                'message' => 'User not authenticated',
                'data' => []
            ];
            return $this->set_response();
        }

        $data = [
            'name' => $this->request->getPost('name'),
            'phone' => $this->request->getPost('phone'),
            'country_code' => $this->request->getPost('code'),
            'email' => $this->request->getPost('code').$this->request->getPost('phone'),
            'user_email' => $this->request->getPost('email'),
            'academic_year' => $this->request->getPost('academic_year'),
            'updated_by' => $this->user_id,
            'updated_at' => date('Y-m-d H:i:s'),
        ];
       
        if($this->request->getFile('image')){
            $image = $this->upload_file('users','image');
            if($image && valid_file($image['file'])){
    			$data['profile_picture'] = $image['file'];
    		}
        } 
    
        $phone_full = $data['email'];
        $user_check = $this->users_model->get(['email' => $phone_full, 'id!=' => $this->user_id]);
        
        // if ($user_check->getNumRows() == 0){
            
            $user_screenshot_id = $this->users_model->edit($data,['id' =>$this->user_id]);
            // log_message('error',print_r($data,true));
            
            if($user_screenshot_id > 0){ 
                $this->response_data = ['status' => 1,'message' => 'success' , 'data' => []];
            }else{
                $this->response_data = ['status' => false,'message' => 'Something Went Wrong' , 'data' => []];
            }
        // }else{
        //     $this->response_data = ['status' => false,'message' => 'Phone Number Already Exist' , 'data' => []];
        // }
        
        return $this->set_response();
    }
    
    public function update_user_image(){
        // ini_set('memory_limit', '256M');
        $this->is_valid_request(['POST']);
        
        $image = $this->upload_file('users','image');
        // log_message('error',print_r($image,true));
        // log_message('error','$_POST '.print_r($_POST,true));
        if($image && valid_file($image['file'])){
			$data['image'] = $image['file'];
		}
		// log_message('error','$data '.print_r($data['image'],true));
		
		$user_screenshot_id = $this->users_model->edit($data,['id' =>$this->user_id]);
        
        if($user_screenshot_id > 0){ 
            $this->response_data = ['status' => 1,'message' => 'success' , 'data' => []];
        }else{
            $this->response_data = ['status' => false,'message' => 'Something Went Wrong' , 'data' => []];
        }
        
        return $this->set_response();
    }
    
    
    // public function get_notification(){
    //     $this->is_valid_request(['GET']);
        
    //     $course_id = $this->request->getGet('course_id');
    //     $logger = service('logger');
    //     $data =  $this->notification_model->get(['course_id' => $course_id])->getResultArray();
    //     $logger->error('Database Error: ' . db_connect()->getLastQuery());   
    //     $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $data];
    //     return $this->set_response();
    // }
    
    
     public function change_password()
     {
        ini_set('memory_limit', '256M');
        $this->is_valid_request(['POST']);
        $password = $this->request->getPost('password');
        $cn_password = $this->request->getPost('confirm_password');
        
        if($password == $cn_password)
        {
            $data = [
                'password' => $this->users_model->password_hash($password),
                'updated_by' => $this->user_id,
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            
            $user_update = $this->users_model->edit($data,['id' =>$this->user_id]);
            
            $this->response_data = ['status' => 1,'message' => 'success' , 'data' => []];

        }
        else
        {
            $this->response_data = ['status' => false,'message' => 'Paasword do not match' , 'data' => []];
        }
        
        return $this->set_response();
    }

}
