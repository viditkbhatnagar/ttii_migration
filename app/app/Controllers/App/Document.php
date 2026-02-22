<?php

namespace App\Controllers\App;
use App\Controllers\App\UserBaseController;
use App\Models\Course_model;

class Document extends UserBaseController
{
    private $course_model;
    public function __construct()
    {
        parent::__construct();
        $this->course_model = new Course_model();
    }
    
    
    public function index($course_id=0)
    {
        $this->data['course_details'] = $this->course_model->get(['id' => $course_id])->getRowArray();
        // echo "<pre>";
        // print_r($this->data['course_details']);die();
        $this->data['page_title'] = 'Course Details';
        $this->data['page_name'] = 'Details/index';
        return view('App/index', $this->data);
    }
    
}
