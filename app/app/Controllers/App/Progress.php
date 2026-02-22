<?php

namespace App\Controllers\App;
use App\Controllers\App\UserBaseController;

class Progress extends UserBaseController
{
    
    public function __construct()
    {
        parent::__construct();
    }

    public function index()
    {
        $this->data['page_title'] = 'Progress';
        $this->data['page_name'] = 'Progress/index';
        return view('App/index', $this->data);
    }
}
