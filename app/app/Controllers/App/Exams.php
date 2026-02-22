<?php

namespace App\Controllers\App;
use App\Controllers\App\UserBaseController;
use App\Models\Exam_model;
use App\Models\Enrol_model;

class Exams extends UserBaseController
{
    private $exam_model;
    
    public function __construct()
    {
        $this->exam_model = new Exam_model();
        $this->enrol_model = new Enrol_model();
        parent::__construct();
    }

    public function index($course_id = 0)
    {
        $course_ids = array_column($this->enrol_model->get(['user_id' => get_user_id()])->getResultArray(), 'course_id');
        $exams = $this->exam_model->get(['course_id' => $course_ids])->getResultArray();
        $exam_data = [];
        foreach($exams as $exam){
            $exam_data[]=$this->exam_model->exam_data($exam, get_user_id());
        }
        $this->data['exams'] =$exam_data;
        // echo"<pre>";print_r($this->data);die();
        $this->data['page_title'] = 'Exams';
        $this->data['page_name'] = 'Exams/index';
        return view('App/index', $this->data);
    }
    
    public function calendar(){
        $this->data['page_title'] = 'Exams';
        $this->data['page_name'] = 'Exams/calendar';
        return view('App/index', $this->data);
    }
    
    public function exam($id){
        
        $this->data['exam_url'] = base_url('exam/exam_web_view/'.$id.'/'.get_user_id());
        // echo"<pre>";print_r($this->data);die();
        $this->data['page_title'] = 'Exams';
        $this->data['page_name'] = 'Exams/exam_iframe';
        return view('App/index', $this->data);
    }
    // public function subject_exam($subject_id = 0)
    // {
    //     $this->data['exams'] = $this->exam_model->get(['subject_id' => $subject_id])->getResultArray();
    //     $this->data['page_title'] = 'Exams';
    //     $this->data['page_name'] = 'Exams/index';
    //     return view('App/index', $this->data);
    // }
}
