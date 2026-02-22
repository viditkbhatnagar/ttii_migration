<?php
namespace App\Controllers\Admin;
use App\Models\Batch_model;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Batch_students_model;


class Batch extends AppBaseController
{
    private $batch_model;
    private $course_model;
    private $users_model;
    private $batch_students_model;



    public function __construct()
    {
        parent::__construct();
        $this->batch_model = new Batch_model();
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();        
        $this->batch_students_model = new Batch_students_model();

    }

    public function index(){
        $this->data['list_items'] = $this->batch_model->get()->getResultArray();

        $course = $this->course_model->get()->getResultArray();
        $this->data['course'] = array_column($course, 'title', 'id');
        
        $this->data['page_title'] = 'Intake';
        $this->data['page_name'] = 'Batch/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add(){
        $this->data['course'] = $this->course_model->get()->getResultArray();
        echo view('Admin/Batch/ajax_add', $this->data);
    }

    public function add(){
        if ($this->request->getMethod() === 'post'){

            $data = [
                // 'course_id'=> $this->request->getPost('course_id'),
                // 'start_date'=> $this->request->getPost('start_date'),
                // 'end_date'=> $this->request->getPost('end_date'),
                'title' => $this->request->getPost('title'),
                'description'=> $this->request->getPost('description'),
                'status'=> $this->request->getPost('status'),

                'created_by' => get_user_id(),
                'updated_by' => get_user_id(),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            $Leads_id = $this->batch_model->add($data);
            if ($Leads_id){
                session()->setFlashdata('message_success', "Batch Added Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/batch/index'));
    }

    public function ajax_edit($id){
        $this->data['course'] = $this->course_model->get()->getResultArray();
        $this->data['edit_data'] = $this->batch_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Batch/ajax_edit', $this->data);
    }

    public function edit($id){
        if ($this->request->getMethod() === 'post'){
            $data = [
                // 'course_id'=> $this->request->getPost('course_id'),
                // 'start_date'=> $this->request->getPost('start_date'),
                // 'end_date'=> $this->request->getPost('end_date'),
                
                'title' => $this->request->getPost('title'),
                'description'=> $this->request->getPost('description'),
                'status'=> $this->request->getPost('status'),
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            $response = $this->batch_model->edit($data, ['id' => $id]);
            if ($response){
                session()->setFlashdata('message_success', "Batch Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/batch/index'));
    }

    public function ajax_view($id){
        $this->data['course'] = $this->course_model->get_array_column([], 'id', 'title');
        $this->data['view_data'] = $this->batch_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Batch/ajax_view', $this->data);
    }

    public function delete($id){
        if ($id > 0){
            if ($this->batch_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Batch Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/batch/index'));
    }
    
    
    
    public function students($id){
        
        $this->data['batches'] = $this->batch_model->get()->getResultArray();
        $this->data['list_items'] = $this->batch_students_model->get_join(
                                    [
                                        ['users', 'users.id = batch_students.user_id'],
                                    ],['batch_students.batch_id' => $id,'users.role_id' => 2],['batch_students.id','users.name','users.phone']
                                    )->getResultArray();
        
        
        
        
        
        $course = $this->course_model->get()->getResultArray();
        $this->data['course'] = array_column($course, 'title', 'id');
        
        $this->data['page_title'] = 'Intake Students';
        $this->data['page_name'] = 'Batch/students';
        return view('Admin/index', $this->data);
    }
    
    public function delete_from_batch($id){
        if ($id > 0){
            
            $batch =  $this->batch_students_model->get(['id' => $id])->getRowArray();
            $batch_id = $batch['batch_id'];
            
            if ($this->batch_students_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Course Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/batch/students/'.$batch_id));
    }
    
}
