<?php
//File: app/Controllers/Api/Home.php

namespace App\Controllers\Api;

use App\Controllers\Api\Api;
use App\Models\Wellness_category_model;
use App\Models\User_wellness_rating_model;

class User extends Api
{
    private $wellness_category_model;
    private $user_wellness_rating_model;

    public function __construct(){
        $this->wellness_category_model = new Wellness_category_model();
        $this->user_wellness_rating_model = new User_wellness_rating_model();
    }
    
    /*** Category List ***/
    public function wellness_categories()
    {
        $this->is_valid_request(['GET']);
        $categories = $this->wellness_category_model->get()->getResultArray();
        
        $category_data = [];
        foreach($categories as $key => $category){
            $category_data[$key]['id'] = $category['id'];
            $category_data[$key]['title'] = ucfirst($category['title']) ?? '';
            $wellness_rating = $this->user_wellness_rating_model->get(['wellness_category_id' => $category['id'], 'user_id' => $this->user_id])->getRowArray();

            if(!empty($wellness_rating))
            {
                $category_data[$key]['rating'] = $wellness_rating['rating'];
                $category_data[$key]['percentage']  = $wellness_rating['rating']*10;  // value/100*10 = value*10
            }
            else
            {
                $category_data[$key]['rating'] = 0;
                $category_data[$key]['percentage'] = 0;
            }
        }
        
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $category_data];
        return $this->set_response();
    }
    
    
    public function add_wellness_rating()
    {
        $this->is_valid_request(['GET']);

        $data['user_id']    = $this->user_id;
        $data['wellness_category_id']  = $this->request->getGet('wellness_category_id');
        $data['rating']  = $this->request->getGet('rating');
        
        $exist = $this->user_wellness_rating_model->get(['wellness_category_id' => $this->request->getGet('wellness_category_id'), 'user_id' => $this->user_id])->getNumRows();


        if($exist>0){
            $data['updated_by'] = $this->user_id;
            $data['updated_at'] = date('Y-m-d H:i:s');
            $this->user_wellness_rating_model->edit($data,['wellness_category_id' => $this->request->getGet('wellness_category_id'), 'user_id' => $this->user_id]);
        }else{
            $data['created_by'] = $this->user_id;
            $data['created_at'] = date('Y-m-d H:i:s');
            $this->user_wellness_rating_model->add($data);
        }

        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => []];
        return $this->set_response();
    }

}
