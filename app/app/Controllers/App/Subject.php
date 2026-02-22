<?php

namespace App\Controllers\App;
use App\Controllers\App\UserBaseController;
use App\Models\Lesson_model;
use App\Models\Lesson_file_model;
use App\Models\Subject_model;
use App\Models\Cohorts_model;
use App\Models\Live_class_model;
use App\Models\Assignment_model;
use App\Models\Assignment_submissions_model;
use App\Models\Enrol_model;
use App\Models\Quiz_model;
use App\Models\Course_model;

class Subject extends UserBaseController
{
    private $lesson_model;
    private $lesson_file_model;
    private $subject_model;
    private $cohorts_model;
    private $live_class_model;
    private $course_model;
    private $quiz_model;
    
    public function __construct()
    {
        parent::__construct();
        $this->lesson_model = new Lesson_model();
        $this->lesson_file_model = new Lesson_file_model();
        $this->subject_model = new Subject_model();
        $this->cohorts_model = new Cohorts_model();
        $this->live_class_model = new Live_class_model();
        $this->assignment_model = new Assignment_model();
        $this->assignment_submissions_model = new Assignment_submissions_model();
        $this->enrol_model = new Enrol_model();
        $this->course_model = new Course_model();
        $this->quiz_model = new Quiz_model();
    }

    public function index($course_id=0)
    {
        $this->data['course_name'] = $this->course_model->get(['id' => $course_id], ['title'])->getRow()->title;
        $this->data['subjects'] = $this->subject_model->get(['course_id' => $course_id])->getResultArray();
        $this->data['page_title'] = 'Subjects';
        $this->data['page_name'] = 'Subject/index';
        return view('App/index', $this->data);
    }
    public function subjects($subject_id=0)
    {
        $lesson_data = $this->lesson_model->get(['subject_id' => $subject_id])->getResultArray();
        $this->data['subject'] = $this->subject_model->get(['id' => $subject_id])->getRowArray();
        if(empty($lesson_data)){
        session()->setFlashdata('message_danger', "No lessons found!!");
           return redirect()->to(base_url('app/subject/index/'.$this->data['subject']['course_id']));
        }
        
        $lesson_ids = array_column($lesson_data, 'id');
        
        $lesson_files = $this->lesson_file_model->get(['lesson_id' => $lesson_ids])->getResultArray();
        
        $grouped = [];
        foreach($lesson_files as $lesson_file){
            $grouped[$lesson_file['lesson_id']][] = $lesson_file;
        }
        
        foreach($lesson_data as &$lesson){
            $lesson['lesson_files'] = $grouped[$lesson['id']] ?? [];
            
        }
        $this->data['lesson_data'] = $lesson_data;
        
        
        $this->data['cohorts'] = $this->cohorts_model->get_join(
            [['users', 'users.id = cohorts.instructor_id']],
            ['cohorts.subject_id' => $subject_id],
            ['cohorts.*','users.name as instructor_name']
            )->getResultArray();
        $this->data['practice_link'] = base_url('exam/practice_web_view/'.$this->user_id);
        
        $this->data['live_classes'] = $this->live_class_model->get()->getResultArray();
        
        $user_id = get_user_id();
        if (!$user_id) {
            // Handle the case where user ID is not found
            return redirect()->to(base_url('login/index')); // or handle it appropriately
        }
    
        
        // echo '<pre>'; print_r($this->data);die();
        $this->data['page_title'] = 'Subjects';
        $this->data['page_name'] = 'Subject/subjects';
        return view('App/index', $this->data);
    }
    
    public function attend_quiz($lesson_file_id){
        $this->data['list_items'] = $this->quiz_model->get(['lesson_file_id' => $lesson_file_id])->getResultArray();
        $this->data['lesson_file_data'] = $this->lesson_file_model->get(['id' => $lesson_file_id])->getRowArray();
        $this->data['course_id'] = $this->lesson_model->get(['id' => $this->data['lesson_file_data']['lesson_id']])->getRow()->course_id;
        // echo '<pre>'; print_r($this->data);die();
        $this->data['page_title'] = 'Subjects';
        $this->data['page_name'] = 'Subject/attend_quiz';
        return view('App/index', $this->data);
    }
    
}
