<?php
namespace App\Controllers\Admin;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Student_fee_model;

class Course_fee extends AppBaseController
{
    public function __construct()
    {
        parent::__construct();
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->student_fee_model = new Student_fee_model();
    }

    public function index(){
        
        $this->data['users'] = $this->users_model->get(['role_id' => 2], null, ['id', 'desc'])->getResultArray();

        $this->data['list_items'] = $this->course_model->get()->getResultArray();
        $this->data['page_title'] = 'Course Fee';
        $this->data['page_name'] = 'Course_fee/index';
        return view('Admin/index', $this->data);
    }
    
    
    public function view_payments($id)
    {
        $this->data['list_items'] = $this->student_fee_model->get_join(
        [
        	['users', 'users.id = student_payments.user_id'],
        ],
        [],
        [' student_payments.*', 'users.name as student'] 
        )->getResultArray();
        
        
        
        $this->student_fee_model->get(['course_id' => $id])->getResultArray();
      
      
        $this->data['page_title'] = 'Payments';
        $this->data['page_name'] = 'Course_fee/payments';
        return view('Admin/index', $this->data);
    }
    

}
