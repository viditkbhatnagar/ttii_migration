<?php

namespace App\Controllers\App;

use App\Controllers\App\UserBaseController;
use App\Models\Live_class_model;
use App\Models\Course_model;
use App\Models\Users_model;

class Live_class extends UserBaseController
{
    private $live_class_model;
    private $course_model;
    private $Users_model;

    public function __construct()
    {
        $this->live_class_model = new Live_class_model();
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        parent::__construct();
    }

    public function index($course_id = 0)
{
    $live_classes = $this->live_class_model->get_live_classes(get_user_id(), $course_id);
    
    $current = [];
    $upcoming = [];
    $completed = [];
    
    if(!empty($live_classes)){
        foreach($live_classes as $live_class){
            if($live_class['status'] == 'Live Now'){
                $current[] = $live_class;
            } elseif($live_class['status'] == 'Expired'){
                $completed[] = $live_class;
            } else {
                $upcoming[] = $live_class;
            }
        }
    }
    
    $this->data['current_live_classes'] = $current;
    $this->data['upcoming_live_classes'] = $upcoming;
    $this->data['completed_live_classes'] = $completed;
    
    $this->data['user_id'] = $this->user_id;
    $this->data['page_title'] = 'Live Class';
    $this->data['page_name'] = 'Live_class/index';
    
    return view('App/index', $this->data);
}
}
