<?php

namespace App\Controllers\App;
use App\Controllers\App\UserBaseController;
use App\Models\Users_model;

class Profile extends UserBaseController
{
    private $users_model;

    public function __construct()
    {
        parent::__construct();
        $this->users_model = new Users_model();
    }

    public function index()
    {
        $user_id = get_user_id();
        $this->data['user_details'] = $this->users_model->get(['id' => $user_id])->getRowArray();
        // echo("<pre>");
        // print_r($this->data);die();
        $this->data['page_title'] = 'User Profile';
        $this->data['page_name'] = 'Profile/index';
        return view('App/index', $this->data);
    }
    
    public function edit(){
         if ($this->request->getMethod() === 'post'){
            $data = [
                'name'       => $this->request->getPost('name'),
                'user_email' => $this->request->getPost('email'),
                'phone'      => $this->request->getPost('phone'),
                'dob'        => $this->request->getPost('dob'),
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            
            $image = $this->upload_file('profile_image','image');
            if($image && valid_file($image['file'])){
				$data['image'] = $image['file'];
			}
            
            
            $user_id = get_user_id();
            $response = $this->users_model->edit($data, ['id' => $user_id]);
            if ($response){
                session()->setFlashdata('message_success', "profile Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('app/profile/index'));
    }
}
