<?php

namespace App\Controllers\App;
use App\Controllers\App\UserBaseController;
use App\Models\Student_fee_model;
use App\Models\Course_model;

class Payment extends UserBaseController
{
    private $student_fee_model;
    private $course_model;
    
    public function __construct()
    {
        $this->student_fee_model = new Student_fee_model();
        $this->course_model = new Course_model();
        parent::__construct();
    }

    public function index()
    {
        // $this->data['list_items'] = $this->student_fee_model->get(['user_id' => get_user_id()])->getResultArray();
        // $this->data['next_payment_date'] = $this->student_fee_model->get(['user_id' => get_user_id()],[],['id','desc'])->getRow()->due_date ?? 'Not Available';
        // $this->data['courses'] = array_column($this->course_model->get([],['id','title'])->getResultArray(),'title', 'id');
        // echo"<pre>";print_r($this->data);die();
        $this->data['payment'] = $this->student_fee_model->get(['user_id' => get_user_id()])->getResultArray();
        $this->data['page_title'] = 'Payment';
        $this->data['page_name'] = 'Payment/index';
        return view('App/index', $this->data);
    }
}