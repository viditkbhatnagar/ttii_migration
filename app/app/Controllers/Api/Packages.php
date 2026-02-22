<?php
//File: app/Controllers/Api/Home.php

namespace App\Controllers\Api;

use App\Controllers\Api\Api;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Package_model;

class Packages extends Api
{
    private $users_model;
    public function __construct(){
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->package_model = new Package_model();
    }
    
    /*** Packages List ***/
    public function index()
    {
        $this->is_valid_request(['GET']);
        $userdata  = $this->users_model->get(['id' => $this->user_id])->getRow();
        $course_id = $this->request->getGet('course_id')>0 ? $this->request->getGet('course_id') : $userdata->course_id;
        $packages = $this->package_model->get(['course_id' => $course_id],[''])->getResultArray();
        $package_data['packages'] = [];
        if(!empty($packages)){
            foreach($packages as $package)
            { 
                $start_date = $package['start_date'];
                $end_date   = $package['end_date'];
                $current_date = date('Y-m-d');
                
                if($start_date <= $current_date && $end_date >= $current_date){
                    $package_data['packages'][] = $this->package_model->package_data($package,$userdata);
                }
            }
            $package_data['logo'] = base_url(get_file('uploads/logo/logo.png'));
        }
        $this->response_data = ['status' => 1,'message' => 'succesfully' , 'data' => $package_data];
        return $this->set_response();
    }



}
