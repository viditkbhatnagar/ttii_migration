<?php
namespace App\Controllers\Admin;
use App\Models\Users_model;


class Attendance extends AppBaseController
{
    private $users_model;
    public function __construct()
    {
        parent::__construct();
        $this->users_model = new Users_model();
    }

    public function index(){
        
        $this->data['list_items'] = $this->users_model->get()->getResultArray();
        
        $this->data['page_title'] = 'Attendance';
        $this->data['page_name'] = 'Attendance/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add(){
        echo view('App/Designation/ajax_add', $this->data);
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
            $Leads_id = $this->designation_model->add($data);
            if ($Leads_id){
                session()->setFlashdata('message_success', "Designation Added Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('app/designation/index'));
    }

    public function ajax_edit($id){
        $this->data['edit_data'] = $this->designation_model->get(['id' => $id])->getRowArray();
        echo view('App/Designation/ajax_edit', $this->data);
    }

    public function edit($id){
        if ($this->request->getMethod() === 'post'){
            $data = [
                'title' => $this->request->getPost('title'),
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            $response = $this->designation_model->edit($data, ['id' => $id]);
            if ($response){
                session()->setFlashdata('message_success', "Designation Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('app/designation/index'));
    }

    public function ajax_view($id){
        $this->data['view_data'] = $this->designation_model->get(['id' => $id])->getRowArray();
        echo view('App/Designation/ajax_view', $this->data);
    }

    public function delete($id){
        if ($id > 0){
            if ($this->designation_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Designation Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('app/designation/index'));
    }
    
}
