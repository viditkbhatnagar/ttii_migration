<?php

namespace App\Controllers\App;
use App\Controllers\App\UserBaseController;
use App\Models\Subject_model;
use App\Models\Lesson_model;
use App\Models\Course_model;
use App\Models\Lesson_file_model;
use App\Models\Payment_model;

class Lessons extends UserBaseController
{
    private $payment_model;
    private $lesson_model;
    private $subject_model;
    private $lesson_file_model;
    
    public function __construct()
    {
        $this->lesson_file_model = new Lesson_file_model();
        $this->lesson_model = new Lesson_model();
        $this->subject_model = new Subject_model();
        $this->payment_model = new Payment_model();
        $this->course_model = new Course_model();
        parent::__construct();
    }
// old index function backup
    public function index($lesson_id)
    {
        $this->data['video_data'] = $this->lesson_file_model->get(['lesson_id' => $lesson_id])->getResultArray();
        $this->data['lesson_id'] = $lesson_id;
        // echo "<pre>"; print_r($this->data);die();
        $this->data['page_title'] = 'Lessons';
        $this->data['page_name'] = 'Lessons/index_old';
        return view('App/index', $this->data);
   
   
    }
    
    public function index_old($course_id = 0)
    {
        $subjects = $this->subject_model->get(['course_id' => $course_id],['id','title','course_id','thumbnail','icon','free'])->getResultArray();
        $purchase_status = $this->payment_model->user_purchase_status(get_user_id(), $course_id);
        
        foreach($subjects as $key=> $subject){
            $subject_purchase_status = $this->payment_model->user_purchase_status(get_user_id(), $course_id, $subject['id']);
            $subjects[$key]['thumbnail'] = valid_file($subject['thumbnail']) ? base_url(get_file($subject['thumbnail'])) : '';
            $subjects[$key]['icon'] = valid_file($subject['icon']) ? base_url(get_file($subject['icon'])) : '';
            $subjects[$key]['free'] = $subject['free'] == 'on' ? 'on' : $subject_purchase_status;
        }
        $this->data['subjects'] = $subjects;
        $this->data['course_id'] = $course_id;
        $this->data['dout_number'] = 9447597134;
        
        // echo "<pre>";  print_r($this->data);die();
        $this->data['page_title'] = 'Lessons';
        $this->data['page_name'] = 'Lessons/index';
        return view('App/index', $this->data);
    }
}
