<?php

namespace App\Controllers\App;
use App\Controllers\App\UserBaseController;


class My_subjects extends UserBaseController
{

    public function __construct()
    {
        parent::__construct();
    }

    public function index()
    {
       
        $this->data['page_title'] = 'All Subjects';
        $this->data['page_name'] = 'My_subjects/index';
        return view('App/index', $this->data);
    }
    
}
