<?php
namespace App\Controllers\Admin;
use App\Models\Users_model;
class Admin extends AppBaseController
{
    private $users_model;
    public function __construct()
    {
        parent::__construct();
        $this->users_model = new Users_model();
        
    }

    public function index(){
        $this->data['list_items'] = $this->users_model->get(['role_id' => 1])->getResultArray();
        $this->data['page_title'] = 'Super Admin';
        $this->data['page_name'] = 'Admin/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add(){
        // log_message('error','$this->data'.print_r($this->data,true));
        echo view('Admin/Admin/ajax_add', $this->data);
    }
    
    public function add(){
        if ($this->request->getMethod() === 'post'){
            $data = [
                'name'      => $this->request->getPost('name'),
                'email'     => $this->request->getPost('email'),
                'phone'     => $this->request->getPost('phone'),
                'role_id'   => 1,
                'password'  => $this->users_model->password_hash($this->request->getPost('password')),
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => get_user_id()
            ];
            
            $admin_id = $this->users_model->add($data);
            if ($admin_id){
                session()->setFlashdata('message_success', "Super Admin Added Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/admin/index'));
    }
    
    public function ajax_edit($id){
        $this->data['edit_data'] = $this->users_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Admin/ajax_edit', $this->data);
    }

    public function edit($id){
        if ($this->request->getMethod() === 'post'){
            $data = [
                'name'      => $this->request->getPost('name'),
                'email'     => $this->request->getPost('email'),
                'phone'     => $this->request->getPost('phone'),
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            $response = $this->users_model->edit($data, ['id' => $id]);
            if ($response){
                session()->setFlashdata('message_success', "Super Admin Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/admin/index'));
    }

    public function ajax_view($id){
        $this->data['view_data'] = $this->users_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Admin/ajax_view', $this->data);
    }
    
    public function delete($id){
        if ($id > 0){
            if ($this->users_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Super Admin Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/admin/index'));
    }
    
}
