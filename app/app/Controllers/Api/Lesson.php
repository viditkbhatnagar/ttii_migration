<?php
//File: app/Controllers/Api/Home.php

namespace App\Controllers\Api;

use App\Controllers\Api\Api;
use App\Models\Course_model;
use App\Models\Lesson_model;
use App\Models\Payment_model;

class Lesson extends Api
{
    private $users_model;
    public function __construct(){
        $this->lesson_model = new Lesson_model();
        $this->payment_model = new Payment_model();
    }
    
    /*** Lessons List By Course***/
    public function index()
    {
        $this->is_valid_request(['GET']);
        $subject_id = $this->request->Getget('subject_id');
        $lessons = $this->lesson_model->get(['subject_id' => $subject_id])->getResultArray();

        // echo "<pre>";
        // print_r($lessons); exit();
        $lessons_data = [];
       
        if(!empty($lessons))
        {
            foreach($lessons as $key => $lesson)
            {
                $purchase_status = $this->payment_model->user_purchase_status($this->user_id, $lesson['course_id']);
                $lessons_data[] = $this->lesson_model->lesson_data($lesson, $this->user_id,$purchase_status,$key);
            }
        }
        
        $data = [
                'lesson' => $lessons_data
            ];
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $data];
        return $this->set_response();
    }

}
