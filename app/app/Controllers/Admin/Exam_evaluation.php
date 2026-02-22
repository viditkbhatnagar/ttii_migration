<?php
namespace App\Controllers\Admin;
use App\Models\Exam_model;
use App\Models\Course_model;
use App\Models\Subject_model;
use App\Models\Lesson_model;
use App\Models\Lesson_file_model;
use App\Models\Question_bank_model;
use App\Models\Exam_questions_model;
use App\Models\Category_model;
use App\Models\Batch_model;

class Exam_evaluation extends AppBaseController
{
    private $Exam_model;
    public function __construct()
    {
        parent::__construct();
        $this->exam_model = new Exam_model();
        $this->course_model = new Course_model();
        $this->subject_model = new Subject_model();
        $this->lesson_model = new Lesson_model();
        $this->lesson_file_model = new Lesson_file_model();
        $this->question_bank_model = new Question_bank_model();
        $this->exam_questions_model = new Exam_questions_model();
        $this->category_model = new Category_model();
        $this->batch_model = new Batch_model();
    }

    public function index(){

        $this->data['list_items']   = $this->exam_model->get()->getResultArray();
        $course                     = $this->course_model->get()->getResultArray();
        $this->data['course']       = array_column($course,'title','id');
        
        $batch                     = $this->batch_model->get(['status' => 1])->getResultArray();
        $this->data['batch']       = array_column($batch,'title','id');
        
        $this->data['page_title']   = 'Evaluation';
        $this->data['page_name']    = 'Exam_evaluation/index';
        return view('Admin/index', $this->data);
    }
    
   
   
}