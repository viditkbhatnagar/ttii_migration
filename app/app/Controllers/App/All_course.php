<?php

namespace App\Controllers\App;
use App\Controllers\App\UserBaseController;


class All_course extends UserBaseController
{

    public function __construct()
    {
        parent::__construct();
    }

    public function index()
    {
       
        $this->data['page_title'] = 'All Courses';
        $this->data['page_name'] = 'All_course/index';
        return view('App/index', $this->data);
    }
    
}
