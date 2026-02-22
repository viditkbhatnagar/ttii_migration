<?php
namespace App\Controllers\Admin;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Cohorts_model;
use App\Models\Cohort_students_model;
use App\Models\Languages_model;
use App\Models\Live_class_model;
use App\Models\Cohort_announcements_model;
use App\Models\Assignment_model;

class Email extends AppBaseController
{
    public function __construct()
    {
        parent::__construct();
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->cohorts_model = new Cohorts_model();
        $this->cohort_students_model = new Cohort_students_model();
        $this->languages_model = new Languages_model();
        $this->live_class_model = new Live_class_model();
        $this->assignment_model = new Assignment_model();
        $this->cohort_announcements_model = new Cohort_announcements_model();
        $this->db = \Config\Database::connect();
    }

    public function common(){
        
        $this->data['page_title'] = 'Email';
        $this->data['page_name'] = 'Email_template/common_template';
        return view('Admin/index', $this->data);
    }

    // public function application(){
        
    //     $this->data['page_title'] = 'Email';
    //     $this->data['page_name'] = 'Email_template/new_application';
    //     return view('Admin/index', $this->data);
    // }

    // public function welcome(){
        
    //     $this->data['page_title'] = 'Email';
    //     $this->data['page_name'] = 'Email_template/welcome';
    //     return view('Admin/index', $this->data);
    // }
}