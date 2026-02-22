<?php

namespace App\Controllers\App;

use App\Controllers\App\UserBaseController;
use App\Models\Feed_model;

class Feed extends UserBaseController
{
    protected $feed_model;

    public function __construct()
    {
        parent::__construct();
        $this->feed_model = new Feed_model();
    }

    public function index()
    {
        $feeds = $this->feed_model->get()->getResultArray(); 
        
        $this->data['page_title'] = 'Feed';
        $this->data['page_name'] = 'Feed/index';
        $this->data['feeds'] = $feeds; 

        return view('App/index', $this->data);
    }
}
