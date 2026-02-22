<?php
namespace App\Controllers\Admin;
use App\Models\Exam_model;
use App\Models\Course_model;
use App\Models\Subject_model;
use App\Models\Lesson_model;
use App\Models\Question_bank_model;
use App\Models\Exam_questions_model;
use App\Models\Exam_answer_model;
use App\Models\Users_model;

class Exam_result extends AppBaseController
{
    private $Exam_model;
    public function __construct()
    {
        parent::__construct();
        $this->exam_model = new Exam_model();
        $this->course_model = new Course_model();
        $this->subject_model = new Subject_model();
        $this->lesson_model = new Lesson_model();
        $this->question_bank_model = new Question_bank_model();
        $this->exam_questions_model = new Exam_questions_model();
        $this->exam_answer_model = new Exam_answer_model();
        $this->users_model = new Users_model();
    }

    public function index(){
        if ($this->request->getMethod() == 'get'){
            $course_id  = $this->request->getGet('course_id');
            $exam_id    = $this->request->getGet('exam_id');
            $student_list = $this->exam_answer_model->get(['exam_id' => $exam_id],null,null,null,['user_id'])->getResultArray();
    
            foreach($student_list as $key =>  $student){
                $exam_mark       = $this->exam_model->get(['id' => $exam_id])->getRow()->mark;
                $student_list[$key]['name']             = $this->users_model->get(['id' => $student['user_id']])->getRow()->name;
                $student_list[$key]['phone']            = $this->users_model->get(['id' => $student['user_id']])->getRow()->phone;
                $student_list[$key]['total_correct']    = $this->exam_answer_model->get(['user_id' => $student['user_id'],'exam_id' => $exam_id,'answer_status' => 1])->getNumRows();
                $student_list[$key]['total_incorrect']  = $this->exam_answer_model->get(['user_id' => $student['user_id'],'exam_id' => $exam_id,'answer_status' => 0])->getNumRows();
                $student_list[$key]['total_mark']       = $exam_mark * $student_list[$key]['total_correct'];
            }
            
            // Sort the student list based on total marks in descending order
            usort($student_list, function($a, $b) {
                return $b['total_mark'] - $a['total_mark'];
            });
    
            // Assign ranks
            $rank = 1;
            foreach($student_list as $key => $student) {
                $student_list[$key]['rank'] = $rank++;
            }
            
            $this->data['student_list'] = $student_list;
        }
        
        $this->data['courses']       = $this->course_model->get()->getResultArray();
        $this->data['page_title']   = 'Exam Result';
        $this->data['page_name']    = 'Exam_result/index';
        return view('Admin/index', $this->data);
    }
    
    public function get_exam_by_course_id(){
        $course_id = $this->request->getPost('course_id');
        $exam_id = $this->request->getPost('exam_id');
        $exams = $this->exam_model->get(['course_id' => $course_id])->getResultArray();
        $html_options = "<option value=''>Choose Exam</option>";
        foreach ($exams as $exam) {
            $selected = ($exam['id'] == $exam_id) ? 'selected' : '';
            $html_options .= "<option value='" . $exam['id'] . "' $selected>" . $exam['title'] . "</option>";
        }
        echo $html_options;
    }
}
