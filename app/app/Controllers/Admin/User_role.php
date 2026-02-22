<?php
namespace App\Controllers\App;
use App\Models\User_role_model;
class User_role extends AppBaseController
{
    private $user_role_model;
    public function __construct()
    {
        parent::__construct();
        $this->user_role_model = new User_role_model();

    }

    public function index(){
        $this->data['list_items'] = $this->user_role_model->get()->getResultArray();
        $this->data['page_title'] = 'User Role';
        $this->data['page_name'] = 'User_role/index';
        return view('App/index', $this->data);
    }

    public function ajax_add(){
        echo view('App/User_role/ajax_add', $this->data);
    }

    public function add(){
        if ($this->request->getMethod() === 'post'){
            $data = [
                'title' => $this->request->getPost('title'),
                'created_by' => get_user_id(),
                'updated_by' => get_user_id(),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            $lead_source_id = $this->user_role_model->add($data);
            if ($lead_source_id){
                session()->setFlashdata('message_success', "User Role Added Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('app/user_role/index'));
    }

    public function ajax_edit($id){
        $this->data['edit_data'] = $this->user_role_model->get(['id' => $id])->getRowArray();
        echo view('App/User_role/ajax_edit', $this->data);
    }

    public function edit($id){
        if ($this->request->getMethod() === 'post'){
            $data = [
                'title' => $this->request->getPost('title'),
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            $response = $this->user_role_model->edit($data, ['id' => $id]);
            if ($response){
                session()->setFlashdata('message_success', "User Role Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('app/user_role/index'));
    }

    public function ajax_view($id){
        $this->data['view_data'] = $this->user_role_model->get(['id' => $id])->getRowArray();
        echo view('App/User_role/ajax_view', $this->data);
    }

    public function delete($id){
        if ($id > 0){
            if ($this->user_role_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "User Role Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('app/user_role/index'));
    }
}
