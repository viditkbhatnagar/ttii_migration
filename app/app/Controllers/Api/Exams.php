<?php
//File: app/Controllers/Api/Home.php

namespace App\Controllers\Api;

use App\Controllers\Api\Api;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Exam_model;

class Exams extends Api
{
    private $users_model;
    public function __construct(){
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->exam_model = new Exam_model();
    }
    
    
    public function index()
    {
        $logger = service('logger');
        $this->is_valid_request(['GET']);
        $userdata =$this->users_model->get(['id' => $this->user_id])->getRow();
        $course_id = $this->request->Getget('course_id')>0 ? $this->request->Getget('course_id') : $userdata->course_id;
        $subject_id = $this->request->Getget('subject_id');
        $lesson_id = $this->request->Getget('lesson_id');
        
        $where['course_id'] = $course_id;
        if($subject_id>0)
        {
            $where['subject_id'] = $subject_id;
        }
        if($lesson_id>0)
        {
            $where['lesson_id'] = $lesson_id;
        }
        
        $exams = $this->exam_model->get($where)->getResultArray();

        $exam_data = [
            'upcoming_exams' => [],
            'expired_exams' => []
        ];
        
        if (!empty($exams)) {
            foreach ($exams as $exam) {

                $exam_info = $this->exam_model->exam_data($exam, $this->user_id);
                $exam_date_time = $exam['from_date'] . ' ' . $exam['from_time']; // e.g., '2024-01-15 10:00:00'
                $exam_timestamp = strtotime($exam_date_time); // Convert to a timestamp
                
                if ($exam_timestamp > time()) {
                    $exam_data['upcoming_exams'][] = $exam_info;
                } else {
                    $exam_data['expired_exams'][] = $exam_info;
                }
            }
        } else {
            $exam_data['upcoming_exams'] = [];
            $exam_data['expired_exams'] = [];
        }

        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $exam_data];
        return $this->set_response();
    }
    
    public function exam_calendar()
    {
        $this->is_valid_request(['GET']);     
        $userdata =$this->users_model->get(['id' => $this->user_id])->getRow();
        $course_id = $this->request->Getget('course_id')>0 ? $this->request->Getget('course_id') : $userdata->course_id;
        $exams = $this->exam_model->get(['course_id' => $course_id])->getResultArray();
        
        if(!empty($exams))
        {
            $data = $this->exam_model->get_exam_calendar($exams,$this->user_id);
        }
        else
        {
            $data = $this->exam_model->get_calendar_empty($exams);
        }
        
        
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $data];
        return $this->set_response();
    }
    
    
    
    


}
