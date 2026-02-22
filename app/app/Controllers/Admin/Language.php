<?php
namespace App\Controllers\Admin;
use App\Models\Languages_model;

class Language extends AppBaseController
{
    private $language_model;
    public function __construct()
    {
        parent::__construct();
        $this->language_model = new Languages_model();
    }

    public function index(){

        $this->data['list_items'] =  $this->language_model->get()->getResultArray();
        
        $this->data['page_title'] = 'Language';
        $this->data['page_name'] = 'Language/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add(){
        echo view('Admin/Language/ajax_add', $this->data);
    }

    public function add(){
        if ($this->request->getMethod() === 'post'){
            
            $data = [
                'title' => $this->request->getPost('title'),
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
                'updated_by' => get_user_id(),
            ];
            
            $cat_id = $this->language_model->add($data);
            if ($cat_id){
                session()->setFlashdata('message_success', "Language Added Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/language/index'));
    }

    public function ajax_edit($id){
        $this->data['edit_data'] = $this->language_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Language/ajax_edit', $this->data);
    }

    public function edit($id){
        
        if ($this->request->getMethod() === 'post'){
            
            $data = [
                'title' => $this->request->getPost('title'),
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            
            
            $response = $this->language_model->edit($data, ['id' => $id]);
            if ($response){
                session()->setFlashdata('message_success', "Language Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/language/index'));
    }

    public function ajax_view($id){
        $this->data['view_data'] = $this->language_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Language/ajax_view', $this->data);
    }

    public function delete($id){
        if($id > 0){
            if($this->language_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Language Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/language/index'));
    }
    
}
