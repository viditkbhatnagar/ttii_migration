<?php
namespace App\Controllers\App;
use App\Models\Users_model;
class Account extends AppBaseController
{
    private $users_model;
    public function __construct()
    {
        parent::__construct();
        $this->users_model = new Users_model();
        
    }

    public function index(){
        // $this->data['list_items'] = $this->users_model->get(['role_id' => 4])->getResultArray();
        $this->data['page_title'] = 'Account';
        $this->data['page_name'] = 'Account/index';
        return view('App/index', $this->data);
    }
    
    public function ajax_add(){
        
        echo view('App/Account/ajax_add', $this->data);
    }
    
    public function add(){
        if ($this->request->getMethod() === 'post'){
            $data = [
                'name'      => $this->request->getPost('name'),
                'email'     => $this->request->getPost('email'),
                'phone'     => $this->request->getPost('phone'),
                'role_id'   => 4,
                'password'  => password_hash($this->request->getPost('password'), PASSWORD_DEFAULT),
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => get_user_id()
            ];
            
            $team_manager_id = $this->users_model->add($data);
            if ($team_manager_id){
                session()->setFlashdata('message_success', "Team Manager Added Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('app/team_managers/index'));
    }
    
    public function ajax_edit($id){
        // $this->data['edit_data'] = $this->users_model->get(['id' => $id])->getRowArray();
        echo view('App/Team_members/ajax_edit', $this->data);
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
                session()->setFlashdata('message_success', "Team Manager Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('app/team_managers/index'));
    }

    public function ajax_view($id){
        // $this->data['view_data'] = $this->users_model->get(['id' => $id])->getRowArray();
        echo view('App/Team_members/ajax_view', $this->data);
    }
    
    public function delete($id){
        if ($id > 0){
            if ($this->users_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Team Manager Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('app/team_managers/index'));
    }
    
}
