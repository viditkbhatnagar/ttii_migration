<?php
namespace App\Controllers\Admin;
use App\Models\Live_class_model;
use App\Models\Category_model;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Package_model;
use App\Models\Zoom_history_model;

class Live_report extends AppBaseController
{
    public function __construct()
    {
        parent::__construct();
        $this->live_class_model = new Live_class_model();
        $this->category_model = new Category_model();
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->package_model = new Package_model();
        $this->zoom_history_model = new Zoom_history_model();
    }

    public function index(){
        if ($this->request->getMethod() === 'get'){
            $live_id    = $this->request->getGet('live_id');
            $date       = $this->request->getGet('date');
            $this->data['users']        = array_column($this->users_model->get()->getResultArray(),'name','id');
            $this->data['list_items']   = $this->zoom_history_model->get(['live_id' => $live_id,'join_date' => $date])->getResultArray();
        }
        
        
        
        $this->data['lives']   = $this->live_class_model->get()->getResultArray();
        $this->data['page_title']   = 'Live Report';
        $this->data['page_name']    = 'Live_class/live_report';
        return view('Admin/index', $this->data);
    }
    
    
}
