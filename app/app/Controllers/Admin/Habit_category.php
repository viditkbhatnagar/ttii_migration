<?php
namespace App\Controllers\Admin;
use App\Models\Habit_category_model;

class Habit_category extends AppBaseController
{
    private $habit_category_model;
    public function __construct()
    {
        parent::__construct();
        $this->habit_category_model = new Habit_category_model();
    }

    public function index(){
        $categorys = $this->habit_category_model->get()->getResultArray();
        
        $this->data['list_items'] = $categorys;
        
        $this->data['page_title'] = 'Habit Category';
        $this->data['page_name'] = 'Habit_category/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add(){
        echo view('Admin/Habit_category/ajax_add', $this->data);
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
            $image = $this->upload_file('habit_category','icon');
            if($image && valid_file($image['file'])){
				$data['icon'] = $image['file'];
			}
			
            $cat_id = $this->habit_category_model->add($data);
            if ($cat_id){
                session()->setFlashdata('message_success', "Category Added Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/habit_category/index'));
    }

    public function ajax_edit($id){
        $this->data['edit_data'] = $this->habit_category_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Habit_category/ajax_edit', $this->data);
    }

    public function edit($id){
        
        if ($this->request->getMethod() === 'post'){
            
            $data = [
                'title' => $this->request->getPost('title'),
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            $image = $this->upload_file('habit_category','icon');
            if($image && valid_file($image['file'])){
				$data['icon'] = $image['file'];
			}
			
            $response = $this->habit_category_model->edit($data, ['id' => $id]);
            if ($response){
                session()->setFlashdata('message_success', "Category Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/habit_category/index'));
    }

    public function ajax_view($id){
        $this->data['view_data'] = $this->habit_category_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Habit_category/ajax_view', $this->data);
    }

    public function delete($id){
        if($id > 0){
            if($this->habit_category_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Category Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/habit_category/index'));
    }
    
}
