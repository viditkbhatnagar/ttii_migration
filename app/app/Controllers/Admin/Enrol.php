<?php
namespace App\Controllers\Admin;
use App\Models\Batch_model;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Enrol_model;
use App\Models\Package_model;


class Enrol extends AppBaseController
{
    private $batch_model;
    private $course_model;
    private $users_model;
    private $enrol_model;
    private $package_model;


    public function __construct()
    {
        parent::__construct();
        $this->batch_model = new Batch_model();
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->enrol_model = new Enrol_model();
        $this->package_model = new Package_model();
    }
    
    
    
    
    
    public function index(){
        $this->data['list_items'] = $this->enrol_model->get([],[],['id'=>'desc'])->getResultArray();
        
        $course = $this->course_model->get()->getResultArray();
        $this->data['course'] = array_column($course, 'title', 'id');
        
        $student = $this->users_model->get(['role_id'=>2])->getResultArray();
        $this->data['student'] = array_column($student, 'name', 'id');
        
        $package = $this->package_model->get()->getResultArray();
        $this->data['package'] = array_column($package, 'title', 'id');
 
        
        $this->data['page_title'] = 'Enrol History';
        $this->data['page_name'] = 'Enrol/index';
        return view('Admin/index', $this->data);
    }

    public function enrol_student(){
        
        $this->data['course'] = $this->course_model->get()->getResultArray();
        $this->data['student'] = $this->users_model->get(['role_id'=>2])->getResultArray();
        $this->data['package'] = $this->package_model->get()->getResultArray();


        
        $this->data['page_title'] = 'Enrol Member';
        $this->data['page_name'] = 'Enrol/enrol_student';
        return view('Admin/index', $this->data);
    }
    
 

    public function enrol_student_save(){
        if ($this->request->getMethod() === 'post'){
            $data = [
                'course_id'=> $this->request->getPost('course_id'),
                'user_id'=> $this->request->getPost('user_id'),
                'package_id'=> $this->request->getPost('package_id'),
                'created_by' => get_user_id(),
                'updated_by' => get_user_id(),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            $enrol = $this->enrol_model->add($data);
            if ($enrol){
                session()->setFlashdata('message_success', "Enrolled Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/enrol/index'));
    }
    
    
    
     public function delete($id){
        if ($id > 0){
            if ($this->enrol_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', " Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/enrol/index'));
    }
 

    
}
