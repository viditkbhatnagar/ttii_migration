<?php

namespace App\Controllers\App;
use App\Controllers\App\UserBaseController;


class Practice extends UserBaseController
{

    public function __construct()
    {
        parent::__construct();
    }

    public function index()
    {
       
        $this->data['page_title'] = 'Practice';
        $this->data['page_name'] = 'Practice/index';
        return view('App/index', $this->data);
    }
}
