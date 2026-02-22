<?php
//File: app/Controllers/Api/Home.php

namespace App\Controllers\Api;

use App\Controllers\Api\Api;
use App\Models\Lesson_file_model;
use App\Models\Payment_model;
use App\Models\Users_model;
use App\Models\Course_model;
use App\Models\Lesson_model;
use App\Models\Lesson_files_report_model;

class Lesson_file extends Api
{
    private $users_model;
    public function __construct(){
        $this->users_model = new Users_model();
        $this->lesson_file_model = new Lesson_file_model();
        $this->course_model = new Course_model();
        $this->lesson_model = new Lesson_model();
        $this->lesson_files_report_model = new Lesson_files_report_model();
    }
    

    public function index()
    {
        $this->is_valid_request(['GET']);
        $lesson_id = $this->request->getGet('lesson_id');
        
        $lesson_files = $this->lesson_file_model->get(['lesson_id' => $lesson_id])->getResultArray();
    
        $videos = []; 
        $other_files = []; 
    
        foreach ($lesson_files as $lesson_file) {
            $attachment_type = $lesson_file['attachment_type'] ?? 'other';
            
            // Treat 'url' as 'video'
            if ($attachment_type === 'url') {
                $attachment_type = 'video';
            }
    
            if ($attachment_type === 'video') {
                $video_data = $this->lesson_file_model->lesson_file_data($lesson_file, $lesson_id, $this->user_id);
                $video_data['sub_title'] = 'Video'; 
                $video_data['related_files'] = []; 
                $videos[$lesson_file['id']] = $video_data;
            } else {
                $other_files[] = $lesson_file;
            }
        }
    
        foreach ($other_files as $file) {
            $parent_id = $file['parent_file_id'] ?? null;
            if ($parent_id && isset($videos[$parent_id])) {
                // Process related file data
                $file_data = $this->lesson_file_model->lesson_file_data($file, $lesson_id, $this->user_id);
                $attachment_type = $file['attachment_type'] ?? 'other';
                $file_data['sub_title'] = ucfirst($attachment_type); // Add subtitle for related file
                
                $videos[$parent_id]['related_files'][] = $file_data;
            }
        }
    
        $lesson_file_data = array_values($videos); // Convert associative array to indexed array
    
        $this->response_data = [
            'status' => 1,
            'message' => 'success',
            'data' => $lesson_file_data
        ];
        
        return $this->set_response();
    }


    
    
    /*** Lesson Videos List By Lesson ***/
    public function videos()
    {
        $this->is_valid_request(['GET']);
        $lesson_id = $this->request->Getget('lesson_id');
        $lesson_videos = $this->lesson_file_model->get(['lesson_id' => $lesson_id, 'attachment_type' => 'url'])->getResultArray();
        // log_message('error','new' .print_r($lesson_videos,true));
        $lesson_video_data = [];
        if(!empty($lesson_videos))
        {
            foreach($lesson_videos as $video){
                $lesson_video_data['video_list'][] = $this->lesson_file_model->lesson_video_data($video,$this->user_id);
            }
        }
        else
        {
            $lesson_video_data['video_list'] = [];
        }
        
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $lesson_video_data];
        return $this->set_response();
    }
    
    /*** Lesson Materials List By Lesson ***/
    public function materials()
    {
        $this->is_valid_request(['GET']);
        $course_id = $this->request->Getget('course_id');
        $subject_id = $this->request->Getget('subject_id');
        $lesson_id = $this->request->Getget('lesson_id');
        $lesson_materials = [];
        $lesson_material_data['material_list'] = [];
        if($lesson_id > 0){
            $lesson_materials = $this->lesson_file_model->get(['lesson_id' => $lesson_id, 'attachment_type' => 'pdf'])->getResultArray();
        }else if($subject_id > 0){
            $lesson_ids = array_column($this->lesson_model->get(['subject_id' => $subject_id])->getResultArray(),'id');
            $lesson_materials = $lesson_ids!=NULL ? $this->lesson_file_model->get(['lesson_id' => $lesson_ids, 'attachment_type' => 'pdf'])->getResultArray() : [];
        }else if($course_id > 0){
            $lesson_ids = array_column($this->lesson_model->get(['course_id' => $course_id])->getResultArray(),'id');
            $lesson_materials = $lesson_ids!=NULL ? $this->lesson_file_model->get(['lesson_id' => $lesson_ids, 'attachment_type' => 'pdf'])->getResultArray() : [];
        }
            
        foreach($lesson_materials as $material){
            $lesson_material_data['material_list'][] = $this->lesson_file_model->lesson_material_data($material,$this->user_id); 
        }
         
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $lesson_material_data];
        return $this->set_response();
    }
    
    /*** Video Progress Save ***/
    public function save_video_progress(){ 
        $this->is_valid_request(['GET']);
        $course_id = $this->request->Getget('course_id');
        if(empty($course_id)){  // If course id not found -> get course id from lesson id -- aurora
            $lesson_id =  $this->lesson_file_model->get(['id' => $this->request->Getget('lesson_file_id')])->getRow()->lesson_id;
            $course_id = $this->lesson_model->get(['id' => $lesson_id])->getRow()->course_id;
        }
        $lesson_file_id = $this->request->Getget('lesson_file_id');
        $lesson_duration = $this->request->Getget('lesson_duration');
        $user_progress = $this->request->Getget('user_progress');
        $progress = $this->lesson_file_model->save_user_video_progress($this->user_id,$course_id,$lesson_file_id,$lesson_duration,$user_progress); 
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $progress];
        return $this->set_response();
    }

    /*** Material Progress Save ***/
    public function save_material_progress(){ 
        $this->is_valid_request(['GET']);
        $course_id = $this->request->Getget('course_id');
        $lesson_file_id = $this->request->Getget('lesson_file_id');
        $attachment_type = $this->request->Getget('attachment_type');
        $progress = $this->lesson_file_model->save_user_material_progress($this->user_id,$course_id,$lesson_file_id,$attachment_type); 
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => []];
        return $this->set_response();
    }
    
    /*** Your Streak ***/
    public function streak_data(){
        $this->is_valid_request(['GET']);
        $userdata = $this->users_model->get(['id' => $this->user_id])->getRow();
        if(!empty($userdata))
        {
            $course_id = $userdata->course_id;
            $from_date = $this->request->Getget('from_date');
            $to_date = $this->request->Getget('to_date');
            $streak_data = $this->course_model->get_streak_data($this->user_id, $course_id, $from_date, $to_date); 
            $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $streak_data];
        }
        else
        {
            $this->response_data = ['status' => 0,'message' => 'user not found' , 'data' => ''];

        }
        return $this->set_response();
    }
    
    public function submit_report(){
        $this->is_valid_request(['POST']);
        $lesson_file_id = $this->request->getPost('lesson_file_id');
		if($lesson_file_id > 0){
    		$already_exists = $this->lesson_files_report_model->get(['user_id' => $this->user_id, 'lesson_file_id' => $lesson_file_id])->getNumRows();
    		
    		if($already_exists == 0){
    		    $data = [
                    'user_id' => $this->user_id,
                    'lesson_file_id' => $lesson_file_id,
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                    'created_by' => $this->user_id,
                    'updated_by' => $this->user_id,
                ];
                if(isset($_FILES) && !empty($_FILES)){
                    $image = $this->upload_file('report_file','report_file');
                    if($image && valid_file($image['file'])){
            			$data['report_file'] = $image['file'];
            			$data['file_type']   = $image['file_type'];
            		}
                }
        		$response = $this->lesson_files_report_model->add($data);
            
                if($response > 0){ 
                    $this->response_data = ['status' => 1, 'message' => 'success' , 'data' => []];
                }else{
                    $this->response_data = ['status' => false, 'message' => 'Something Went Wrong' , 'data' => []];
                }
    		}else{
    		    $this->response_data = ['status' => false, 'message' => 'Already Submitted' , 'data' => []];
    		}
		}else{
            $this->response_data = ['status' => false, 'message' => 'Something Went Wrong' , 'data' => []];
        }
        return $this->set_response();
    }
}
