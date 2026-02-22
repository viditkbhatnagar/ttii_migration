<?php
namespace App\Controllers\Admin;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Faq_model;

class Faq extends AppBaseController
{
    
    public function __construct()
    {
        parent::__construct();
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->faq_model = new Faq_model();
    }

    public function index(){
        
        $this->data['list_items'] = $this->faq_model->get()->getResultArray();
        $this->data['page_title'] = 'FAQ';
        $this->data['page_name'] = 'Faq/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add(){
        echo view('Admin/Faq/ajax_add', $this->data);
    }

    public function add(){
        if ($this->request->getMethod() === 'post'){
            $data = [
                'question' => $this->request->getPost('question'),
                'answer' => $this->request->getPost('answer'),
                'created_by' => get_user_id(),
                'created_at' => date('Y-m-d H:i:s'),
            ];
            $inserted_id = $this->faq_model->add($data);
            if ($inserted_id){
                session()->setFlashdata('message_success', "Added Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/faq/index'));
    }

    public function ajax_edit($id){
        $this->data['edit_data'] = $this->faq_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Faq/ajax_edit', $this->data);
    }

    public function edit($id){
        if ($this->request->getMethod() === 'post'){
            $data = [
                'question' => $this->request->getPost('question'),
                'answer' => $this->request->getPost('answer'),
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            $response = $this->faq_model->edit($data, ['id' => $id]);
            if ($response){
                session()->setFlashdata('message_success', "Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/faq/index'));
    }


    public function delete($id){
        if ($id > 0){
            if ($this->faq_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/faq/index'));
    }
    
    
    

}
