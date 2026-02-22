<?php
namespace App\Controllers\App;
use App\Controllers\App\UserBaseController;
use App\Models\Category_model;
use App\Models\Banner_model;
use App\Models\Course_model;
use App\Models\Enrol_model;
use App\Models\Users_model;
use App\Models\Assignment_submissions_model;
use App\Models\Assignment_model;

class Dashboard extends UserBaseController
{
    private $category_model;
    private $banner_model;
    private $course_model;
    private $enrol_model;
    private $users_model;
    private $assignment_submissions_model;
    private $assignment_model;
    public function __construct()
    {
        parent::__construct();
        $this->category_model = new Category_model();
        $this->banner_model = new Banner_model();
        $this->course_model = new Course_model();
        $this->enrol_model = new Enrol_model();
        $this->users_model = new Users_model();
        $this->assignment_submissions_model = new Assignment_submissions_model();
        $this->assignment_model = new Assignment_model();
    }

    public function index()
    {
        // echo $this->user_id; exit;
        $this->data['course_count'] = $this->course_model->get()->getNumRows();
        $enrolled_courses = $this->enrol_model->get(['user_id' => get_user_id()]);
        $course_ids = array_column($enrolled_courses->getResultArray(), 'course_id');
        $this->data['enrolled_course_count'] = $enrolled_courses->getNumRows();
        $this->data['enrolled_courses'] = [];
        $this->data['other_courses'] = [];
        if (!empty($course_ids)) {
            $this->data['enrolled_courses'] = $this->course_model->get(['id' => $course_ids])->getResultArray();
            $this->data['other_courses'] = $this->course_model->get(['id NOT IN' => $course_ids])->getResultArray();
        }
        
        $submitted_assignments = array_column($this->assignment_submissions_model->get(['user_id' => get_user_id()])->getResultArray(), 'assignment_id');
        
        // Use WHERE IN for course_id and WHERE NOT IN for id
        // $this->data['assignments'] = $this->assignment_model->get([
        //     'course_id' => $course_ids,
        //     'id NOT IN' => $submitted_assignments
        // ])->getResultArray() ?? [];
        $this->data['assignments'] = [];
        
        $this->data['total_assignments'] = $this->assignment_model->get([
            'course_id' => $course_ids,
        ])->getNumRows();
        
        $this->data['completed_assignments'] = count($submitted_assignments);
        // echo"<pre>";print_r($this->data);die();
        $this->data['page_title'] = 'Home';
        $this->data['page_name'] = 'Dashboard/index';
        return view('App/index', $this->data);
    }
    
}
