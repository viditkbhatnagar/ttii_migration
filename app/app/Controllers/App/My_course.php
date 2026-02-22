<?php

namespace App\Controllers\App;
use App\Controllers\App\UserBaseController;


class My_course extends UserBaseController
{

    public function __construct()
    {
        parent::__construct();
    }

    public function index()
    {
       
        $this->data['page_title'] = 'My Courses';
        $this->data['page_name'] = 'My_course/index';
        return view('App/index', $this->data);
    }
}
