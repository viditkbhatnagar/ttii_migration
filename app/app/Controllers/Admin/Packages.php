<?php
namespace App\Controllers\Admin;
use App\Models\Package_model;
use App\Models\Course_model;


class Packages extends AppBaseController
{
    private $package_model;
    private $course_model;

    
    public function __construct()
    {
        parent::__construct();
        $this->package_model = new Package_model();
        $this->course_model = new Course_model();
    }

    public function index(){
        
        $this->data['list_items'] = $this->package_model->get()->getResultArray();
        
        $course = $this->course_model->get()->getResultArray();
        $this->data['course'] = array_column($course, 'title', 'id');
        
        $this->data['page_title'] = 'Packages';
        $this->data['page_name'] = 'Packages/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add(){
        
        $this->data['course'] = $this->course_model->get()->getResultArray();
        echo view('Admin/Packages/ajax_add', $this->data);
    }

    public function add(){
        if ($this->request->getMethod() === 'post'){
           
           
            $data = [
                'title' => $this->request->getPost('title'),
                'course_id' => $this->request->getPost('course_id'),
                'amount' => $this->request->getPost('amount'),
                'discount' => $this->request->getPost('discount'),
                'start_date' => $this->request->getPost('start_date'),
                'end_date' => $this->request->getPost('end_date'),
                'is_free' =>($this->request->getPost('is_free') == 1) ? 1 : 0,
                'description'=> $this->request->getPost('description'),
                'created_by' => get_user_id(),
                'updated_by' => get_user_id(),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            $package = $this->package_model->add($data);
            if ($package){
                session()->setFlashdata('message_success', "Package Added Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/packages/index'));
    }

    public function ajax_edit($id){
        $this->data['course'] = $this->course_model->get()->getResultArray();
        $this->data['edit_data'] = $this->package_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Packages/ajax_edit', $this->data);
    }

    public function edit($id){
        if ($this->request->getMethod() === 'post'){
            $data = [
                'title' => $this->request->getPost('title'),
                'course_id' => $this->request->getPost('course_id'),
                'amount' => $this->request->getPost('amount'),
                'discount' => $this->request->getPost('discount'),
                'start_date' => $this->request->getPost('start_date'),
                'end_date' => $this->request->getPost('end_date'),
                'is_free' =>($this->request->getPost('is_free') == 1) ? 1 : 0,
                'description'=> $this->request->getPost('description'),
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            $response = $this->package_model->edit($data, ['id' => $id]);
            if ($response){
                session()->setFlashdata('message_success', "Package Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/packages/index'));
    }

    public function ajax_view($id){
        $this->data['view_data'] = $this->package_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Packages/ajax_view', $this->data);
    }

    public function delete($id){
        if ($id > 0){
            if ($this->package_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Package Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/packages/index'));
    }
    
    
    
    public function bulk_upload(){
        
        $this->data['list_items'] = $this->package_model->get()->getResultArray();
        
        $this->data['page_title'] = 'Packages';
        $this->data['page_name'] = 'Packages/bulk_upload';
        return view('Admin/index', $this->data);
    }
    
}
