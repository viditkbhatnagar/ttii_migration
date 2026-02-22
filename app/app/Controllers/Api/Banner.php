<?php
//File: app/Controllers/Api/Home.php

namespace App\Controllers\Api;

use App\Controllers\Api\Api;
use App\Models\Banner_model;

class Banner extends Api
{
    private $users_model;
    public function __construct(){
        $this->banner_model = new Banner_model();
    }
    
    /*** Banners List ***/
    public function index()
    {
        $this->is_valid_request(['GET']);
        $data = $this->banner_model->get()->getResultArray();
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $data];
        return $this->set_response();
    }



}
