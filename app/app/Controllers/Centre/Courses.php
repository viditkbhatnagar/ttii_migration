<?php

namespace App\Controllers\Centre;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Centre_course_plans_model;
class Courses extends CentreBaseController
{
    public function __construct()
    {
        parent::__construct();
         $this->users_model = new Users_model();
        $this->centre_course_plans_model = new Centre_course_plans_model();
    }

    public function index()
    {
        $logged_in_user = get_user_id();
        $centre_id = $this->users_model->get(['id' => $logged_in_user])->getRowArray()['centre_id'];
        $this->data['assigned_courses'] = $this->centre_course_plans_model->get_join([['course', 'course.id = centre_course_plans.course_id']],['centre_id' => $centre_id],['course.short_name','course.title as course_title','centre_course_plans.*'])->getResultArray();

        $this->data['page_title'] = 'Assigned Courses';
        $this->data['page_name'] = 'Courses/index';
        return view('Centre/index', $this->data);
    }
    
    
    
}
