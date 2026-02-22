<?php
//File: app/Controllers/Api/Home.php

namespace App\Controllers\Api;

use App\Controllers\Api\Api;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Review_model;
use App\Models\Review_like_model;

class Review extends Api
{
    private $users_model;
    public function __construct(){
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->review_model = new Review_model();
        $this->review_like_model = new Review_like_model();
    }
    
    public function add_review(){
        $this->is_valid_request(['GET']);
        $exist = $this->review_model->get(['course_id' => $this->request->getGet('course_id'), 'user_id' => $this->user_id])->getNumRows();
        $data['user_id']    = $this->user_id;
        $data['course_id']  = $this->request->getGet('course_id');
        $data['rating']  = $this->request->getGet('rating');
        $data['review']  = $this->request->getGet('review');
        
        if($exist>0){
            $data['updated_by'] = $this->user_id;
            $data['updated_at'] = date('Y-m-d H:i:s');
            $this->review_model->edit($data,['course_id' => $this->request->getGet('course_id'), 'user_id' => $this->user_id]);
        }else{
            $data['created_by'] = $this->user_id;
            $data['created_at'] = date('Y-m-d H:i:s');
            $this->review_model->add($data);
        }

        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => []];
        return $this->set_response();
    }
    
    public function get_user_review(){
        $this->is_valid_request(['GET']);
        $review = $this->review_model->get(['course_id' => $this->request->getGet('course_id'), 'user_id' => $this->user_id],['id','course_id','user_id','rating','review'])->getRow();
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $review];
        return $this->set_response();
    }

    /*** Like Course Review ***/
    public function like_review(){
        $this->is_valid_request(['GET']);
        $review_id = $this->request->getGet('review_id');
        $liked = $this->review_like_model->get(['review_id' => $review_id, 'user_id' => $this->user_id])->getNumRows();
        if($liked > 0){
            $this->review_like_model->remove(['review_id' => $review_id, 'user_id' => $this->user_id]);
        }else{
            $data['review_id']  = $review_id;
            $data['user_id']    = $this->user_id;
            $data['created_by'] = $this->user_id;
            $data['created_at'] = date('Y-m-d H:i:s');

            $this->review_like_model->add($data);
        }
        
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => []];
        return $this->set_response();
    }
    
    
}
