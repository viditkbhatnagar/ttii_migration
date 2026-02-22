<?php
namespace App\Controllers\Admin;
use App\Models\Users_model;
use App\Models\Course_model;

use App\Models\Instructor_enrol_model;
use App\Models\Instructor_students_model;
use App\Models\Country_model;


class Instructor extends AppBaseController
{
    private $users_model;
    private $instructor_enrol_model; 
    private $instructor_students_model; 
    private $course_model;
    private $country_model;

    
    public function __construct()
    {
        parent::__construct();
        $this->users_model = new Users_model();
        $this->instructor_enrol_model = new Instructor_enrol_model();
        $this->instructor_students_model = new Instructor_students_model();
        $this->course_model = new Course_model();
        $this->country_model = new Country_model();

    }

    public function index(){
        
        $this->data['list_items'] = $this->users_model->get(['role_id'=>3])->getResultArray();
        
        $this->data['page_title'] = 'Instructor';
        $this->data['page_name'] = 'Instructor/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add(){
        
        $this->data['countries'] = $this->country_model->get([], ['country_id', 'country'])->getResultArray();
        $this->data['country_code'] = get_country_code();

        echo view('Admin/Instructor/ajax_add', $this->data);
    }

    public function add(){
        if ($this->request->getMethod() === 'post'){
    
            
            
            $code = $this->request->getPost('code');
            $phone = $this->request->getPost('phone');
            $email = $this->request->getPost('email');
            $check_phone_duplication = $this->users_model->get(['country_code' => $code ,'phone' => $phone,'role_id' => 3])->getNumRows();
            $check_email_duplication = $this->users_model->get(['user_email' => $email ,'role_id' => 3])->getNumRows();
            
            if($check_phone_duplication == 0 && $check_email_duplication == 0) 
            {
            
                $data = [
                    'name' => $this->request->getPost('name'),
                    'whatsapp_code' => $this->request->getPost('whatsapp_code'),
                    'whatsapp_phone' => $this->request->getPost('whatsapp_phone'),
                    'user_email'     => $email,
                    'country_code'      => $code,
                    'phone'     => $phone,
                    'password'     => $this->users_model->password_hash($this->request->getPost('password')),                             
                    'qualification' => $this->request->getPost('qualification'),
                    'biography' => $this->request->getPost('biography'),
                    'role_id'     => 3,
                    'created_by' => get_user_id(),
                    'updated_by' => get_user_id(),
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
                
                $croppedImage = $this->request->getPost('cropped_image');
                $image = null;
                
                if (!empty($croppedImage)) {
                    $image = $this->upload_base64_image('instructor', $croppedImage);
                }
                
                if ($image && valid_file($image['file'])) {
                    $data['profile_picture'] = $image['file'];
                }
                
    	
			
                $instructor = $this->users_model->add($data);
                if ($instructor){
                    session()->setFlashdata('message_success', "Instructor Added Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            }
            else
            {
                session()->setFlashdata('message_danger', "user already exists"); 
            }
        }
        
        return redirect()->to(base_url('admin/instructor/index'));
    }

    public function ajax_edit($id){
        $this->data['edit_data'] = $this->users_model->get(['id' => $id])->getRowArray();
        
        $this->data['countries'] = $this->country_model->get([], ['country_id', 'country'])->getResultArray();
        $this->data['country_code'] = get_country_code();

        echo view('Admin/Instructor/ajax_edit', $this->data);
    }

    public function edit($id){
        if ($this->request->getMethod() === 'post'){
            
            
            $code = $this->request->getPost('code');
            $phone = $this->request->getPost('phone');
            $email = $this->request->getPost('email');
            $check_phone_duplication = $this->users_model->get(['country_code' => $code ,'phone' => $phone,'id !=' => $id ,'role_id' => 3])->getNumRows();
            $check_email_duplication = $this->users_model->get(['email' => $email,'id !=' => $id ,'role_id' => 3])->getNumRows();
            
            
            if($check_phone_duplication == 0 && $check_email_duplication == 0) 
            {
                
                 $data = [
                    'name' => $this->request->getPost('name'),
                    'whatsapp_code' => $this->request->getPost('whatsapp_code'),
                    'whatsapp_phone' => $this->request->getPost('whatsapp_phone'),
                    'user_email'     => $email,
                    'country_code'      => $code,
                    'phone'     => $phone,
                    'qualification' => $this->request->getPost('qualification'),
                    'biography' => $this->request->getPost('biography'),
                    'updated_by' => get_user_id(),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
                
                $croppedImage = $this->request->getPost('cropped_image');
                $image = null;
                
                if (!empty($croppedImage)) {
                    $image = $this->upload_base64_image('instructor', $croppedImage);
                }
                
                if ($image && valid_file($image['file'])) {
                    $data['profile_picture'] = $image['file'];
                }
			
                if($this->request->getPost('password') != ''){
                    $data['password']= $this->users_model->password_hash($this->request->getPost('password'));
                    
                }

                $instructor = $this->users_model->edit($data, ['id' => $id]);
                if ($instructor){
                    session()->setFlashdata('message_success', "Instructor Added Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
                
            }
            else
            {
                session()->setFlashdata('message_danger', "user already exists"); 
            }
            
        }
        return redirect()->to(base_url('admin/instructor/index'));
    }

    public function ajax_view($id){
        $this->data['view_data'] = $this->users_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Instructor/ajax_view', $this->data);
    }

    public function delete($id){
        if ($id > 0){
            $enrol_data = $this->instructor_enrol_model->get(['instructor_id' => $id])->getNumRows();
            if($enrol_data == 0){
                if ($this->users_model->remove(['id' => $id])){
                    session()->setFlashdata('message_success', "Instructor Deleted Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            }else{
                session()->setFlashdata('message_danger', "You Can\'t Delete Instructor! Enrolled in a Course");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/instructor/index'));
    }
    
    
    
    public function course($id){
        
        $this->data['list_items'] = $this->instructor_enrol_model->get(['instructor_id' => $id])->getResultArray();

    
        $user = $this->users_model->get(['role_id'=>3])->getResultArray();
        $this->data['user'] = array_column($user, 'name', 'id');
        
        $course = $this->course_model->get()->getResultArray();
        $this->data['course'] = array_column($course, 'title', 'id');
        
        $this->data['instructor'] = $id;
        
        $this->data['page_title'] = 'Enrolled Courses';
        $this->data['page_name'] = 'Instructor/course';
        return view('Admin/index', $this->data);
    }
    
    
    
    
     public function ajax_enrol($id)
     {
        $this->data['instructor'] = $id;
        $this->data['course'] = $this->course_model->get()->getResultArray();

        echo view('Admin/Instructor/ajax_enrol', $this->data);
    }
    
    public function enrol_course(){
        if ($this->request->getMethod() === 'post'){
            $ins = $this->request->getPost('instructor_id');
            $data = [
                'course_id'=> $this->request->getPost('course_id'),
                'instructor_id'=> $this->request->getPost('instructor_id'),
                'created_by' => get_user_id(),
                'updated_by' => get_user_id(),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            
            if($this->instructor_enrol_model->get(['course_id' =>  $this->request->getPost('course_id'), 'instructor_id'=> $this->request->getPost('instructor_id')])->getNumRows()==0){
                $enrol = $this->instructor_enrol_model->add($data);
                if ($enrol){
                    session()->setFlashdata('message_success', "Enrolled Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            }else{
                session()->setFlashdata('message_danger', "Already Enrolled to this course");
            }
        }
        return redirect()->to(base_url('admin/instructor/course/'.$ins));
    }
    
    
     public function enrol_delete($id){
        if ($id > 0){
            if ($this->instructor_enrol_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/instructor/index'));
    }
    
    
    public function students($id){
        
        $this->data['list_items'] = $this->instructor_students_model->get_join(
                    [
                        ['users', 'users.id = instructor_students.student_id'],
                        ['course', 'course.id = instructor_students.course_id'],
                        
                    ],['instructor_id' => $id],['instructor_students.id','users.name','course.title','instructor_students.created_at']
                    )->getResultArray();
        
        
        // $this->instructor_students_model->get(['instructor_id' => $id])->getResultArray();
        
        $this->data['instructor'] = $id;
        
        $user = $this->users_model->get(['role_id'=>2])->getResultArray();
        $this->data['students'] = array_column($user, 'name', 'id');
        
        $course = $this->course_model->get()->getResultArray();
        $this->data['course'] = array_column($course, 'title', 'id');
        
        
        $this->data['page_title'] = 'Students';
        $this->data['page_name'] = 'Instructor/students';
        return view('Admin/index', $this->data);
    }
    
    
     public function ajax_assign($id)
     {
        $this->data['instructor'] = $id;

        $this->data['courses'] = $this->instructor_enrol_model->get_join(
                                    [
                                        ['course', 'course.id = instructor_enrol.course_id'],
                                    ],['instructor_enrol.instructor_id' => $id],['course.id','course.title']
                                    )->getResultArray();
        
         $this->data['list_items'] = $this->instructor_enrol_model->get(['instructor_id' => $id])->getResultArray();

    
        $user = $this->users_model->get(['role_id'=>3])->getResultArray();
        $this->data['user'] = array_column($user, 'name', 'id');
        
        $course = $this->course_model->get()->getResultArray();
        $this->data['course'] = array_column($course, 'title', 'id');
        
        $this->data['students'] = $this->users_model->get(['role_id'=>2])->getResultArray();

        echo view('Admin/Instructor/ajax_assign', $this->data);
    }
    
    
     public function assign_student(){
        if ($this->request->getMethod() === 'post'){
            
            $ins = $this->request->getPost('instructor_id');
            $data = [
                'course_id'=> $this->request->getPost('course_id'),
                'instructor_id'=> $this->request->getPost('instructor_id'),
                'student_id'=> $this->request->getPost('student_id'),
                'created_by' => get_user_id(),
                'updated_by' => get_user_id(),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            $enrol = $this->instructor_students_model->add($data);
            if ($enrol){
                session()->setFlashdata('message_success', "Enrolled Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/instructor/students/'.$ins));
    }
    
    
      public function assign_delete($id){
        if ($id > 0){
            if ($this->instructor_students_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/instructor/index'));
    }
    
    
    public function change_device($id){
        if ($id > 0){
            $data['device_id'] = null;
            $response = $this->users_model->edit($data, ['id' => $id]);
            if($response){
                $res = true;
            }
            session()->setFlashdata('message_success', "Device changed Successfully!");
        }
        
        return redirect()->to(base_url('admin/instructor/index'));
    }

    
    
    
    
    
}
