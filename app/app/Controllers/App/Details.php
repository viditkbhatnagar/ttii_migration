<?php

namespace App\Controllers\App;
use App\Controllers\App\UserBaseController;
use App\Models\Course_model;
use App\Models\Subject_model;

class Details extends UserBaseController
{
    private $course_model;
    private $subject_model;
    public function __construct()
    {
        parent::__construct();
        $this->course_model = new Course_model();
        $this->subject_model = new Subject_model();
    }
    
    
    public function index($course_id=0)
    {
        $this->data['course_details'] = $this->course_model->get(['id' => $course_id])->getRowArray();
        $this->data['subjects'] = $this->subject_model->get(['course_id' => $course_id],['id','title','course_id','thumbnail','icon','free'])->getResultArray();
        // echo "<pre>";
        // print_r($this->data['course_details']);die();
        $this->data['page_title'] = 'Course Details';
        $this->data['page_name'] = 'Details/index';
        return view('App/index', $this->data);
    }
    
}
