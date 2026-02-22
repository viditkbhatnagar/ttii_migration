<?php
namespace App\Controllers\Admin;
use App\Models\Events_model;
use App\Models\Users_model;

class Circulars extends AppBaseController
{
    public function __construct()
    {
        parent::__construct();
        $this->events_model = new Events_model();
        $this->users_model = new Users_model();
    }

    public function index(){
        // $this->data['list_items']   = $this->events_model->get()->getResultArray();
        
        $this->data['page_title']   = 'Circulars';
        $this->data['page_name']    = 'Circulars/index';
        
        return view('Admin/index', $this->data);
    }
}