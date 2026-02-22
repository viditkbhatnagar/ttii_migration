<?php
namespace App\Controllers\Centre;

use App\Controllers\Centre\CentreBaseController;
use App\Models\Training_videos_model;
use App\Models\Course_model;
use App\Models\Users_model;

class Training_videos extends CentreBaseController
{
    private $training_videos_model;
    private $course_model;
    private $users_model;

    public function __construct()
    {
        parent::__construct();

        $this->training_videos_model = new Training_videos_model();
        $this->course_model          = new Course_model();
        $this->users_model           = new Users_model();
    }

    public function index()
    {
        $this->data['list_items'] = $this->training_videos_model->get()->getResultArray();
        $this->data['page_title'] = 'Training Videos';
        $this->data['page_name']  = 'Training_videos/index';

        return view('Centre/index', $this->data);
    }

}