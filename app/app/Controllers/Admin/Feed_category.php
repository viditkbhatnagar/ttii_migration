<?php
namespace App\Controllers\Admin;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Feed_category_model;

class Feed_category extends AppBaseController
{
    private $batch_model;
    private $course_model;
    private $users_model;


    public function __construct()
    {
        parent::__construct();
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->feed_category_model = new Feed_category_model();
    }

    public function index(){
        
        $this->data['list_items'] = $this->feed_category_model->get()->getResultArray();
        $this->data['page_title'] = 'Feed category';
        $this->data['page_name'] = 'Feed_category/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add(){
        // $this->data['course'] = $this->course_model->get()->getResultArray();
        echo view('Admin/Feed_category/ajax_add', $this->data);
    }

    public function add(){
        if ($this->request->getMethod() === 'post'){
            $data = [
                'title' => $this->request->getPost('title'),
                'created_by' => get_user_id(),
                'created_at' => date('Y-m-d H:i:s'),
            ];
            $inserted_id = $this->feed_category_model->add($data);
            if ($inserted_id){
                session()->setFlashdata('message_success', "Added Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/feed_category/index'));
    }

    public function ajax_edit($id){
        $this->data['edit_data'] = $this->feed_category_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Feed_category/ajax_edit', $this->data);
    }

    public function edit($id){
        if ($this->request->getMethod() === 'post'){
            $data = [
                'title' => $this->request->getPost('title'),
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            $response = $this->feed_category_model->edit($data, ['id' => $id]);
            if ($response){
                session()->setFlashdata('message_success', "Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/feed_category/index'));
    }

    public function ajax_view($id){
        $this->data['course'] = $this->course_model->get_array_column([], 'id', 'title');
        $this->data['view_data'] = $this->feed_category_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Batch/ajax_view', $this->data);
    }

    public function delete($id){
        if ($id > 0){
            if ($this->feed_category_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/feed_category/index'));
    }
    
    
    

}
