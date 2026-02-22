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

class Exam extends AppBaseController
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
        
        $this->data['page_title']   = 'Exam';
        $this->data['page_name']    = 'Exam/index';
        return view('Admin/index', $this->data);
    }
    
    public function exam_questions($exam_id){
        $questions = $this->question_bank_model->get()->getResultArray();
        $this->data['question_title'] = array_column($questions,'title','id');
        $this->data['list_items'] = $items  = $this->exam_questions_model->get(['exam_id' => $exam_id])->getResultArray();
        foreach($questions as $key=> $question){
            $questions[$key]['is_checked']    = $this->exam_questions_model->get(['question_id' => $question['id'],'exam_id' => $exam_id])->getNumRows() >0 ? 1 : 0;
        }
        // foreach($items as $item){
        //     print_r($item);exit();
        // }
        $this->data['exam_id']      = $exam_id;
        $this->data['page_title']   = 'Exam Questions';
        $this->data['page_name']    = 'Exam/exam_questions';
        return view('Admin/index', $this->data);
    }
    
    public function add_questions($exam_id){
        
        if($this->request->getGet()){
            $where = [];
            if($this->request->getGet('course_id')>0){
                $where['course_id'] = $this->request->getGet('course_id');
            }
            if($this->request->getGet('subject_id')>0){
                $where['subject_id'] = $this->request->getGet('subject_id');
            }
            if($this->request->getGet('lesson_id')>0){
                $where['lesson_id'] = $this->request->getGet('lesson_id');
            }
            $questions = $this->question_bank_model->get($where)->getResultArray();
            foreach($questions as $key=> $question){
                $questions[$key]['is_checked']    = $this->exam_questions_model->get(['question_id' => $question['id'],'exam_id' => $exam_id])->getNumRows() >0 ? 1 : 0;
            }
            $this->data['list_items'] = $questions;
        }
        
        $this->data['courses']       = $this->course_model->get()->getResultArray();
        $this->data['exam_id']       = $exam_id;
        $this->data['page_title']   = 'Add Questions';
        $this->data['page_name']    = 'Exam/add_questions';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add(){
        $this->data['course'] = $this->course_model->get()->getResultArray();
        $this->data['batch'] = $this->batch_model->get()->getResultArray();

        return view('Admin/Exam/ajax_add', $this->data);
    }

    public function add(){
        if ($this->request->getMethod() === 'post'){
            $data = [
                'title'         => $this->request->getPost('title'),
                'mark'          => $this->request->getPost('mark'),
                'description'   => $this->request->getPost('description'),
                'duration'      => $this->request->getPost('duration'),
                'to_time'       => $this->request->getPost('to_time'),
                'to_date'       => $this->request->getPost('to_date'),
                'from_date'     => $this->request->getPost('from_date'),
                'from_time'     => $this->request->getPost('from_time'),
                'course_id'     => $this->request->getPost('course_id'),
                'batch_id'    => $this->request->getPost('batch_id'),
                'free'          => $this->request->getPost('free'),
                'created_by' => get_user_id(),
                'created_at' => date('Y-m-d H:i:s'),
            ];
            
            if($this->request->getPost('is_practice')){
                $data['is_practice']   = $this->request->getPost('is_practice');
            }
            
            $Leads_id = $this->exam_model->add($data);
            if ($Leads_id){
                session()->setFlashdata('message_success', "Exam Added Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
            
            return redirect()->to(base_url('admin/exam/index'));
        }
       
       
        $this->data['course'] = $this->course_model->get()->getResultArray();
        $this->data['batch'] = $this->batch_model->get()->getResultArray();

        $this->data['page_title']   = 'Add Exam';
        $this->data['page_name']    = 'Exam/add';
        return view('Admin/index', $this->data);  
    }

    public function ajax_edit($id){
        $this->data['course'] = $this->course_model->get()->getResultArray();
        $this->data['edit_data'] = $this->exam_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Exam/ajax_edit', $this->data);
    }

    public function edit($id)
    {
        if ($this->request->getMethod() === 'post')
        {
            $data = [
                'title'         => $this->request->getPost('title'),
                'mark'          => $this->request->getPost('mark'),
                'description'   => $this->request->getPost('description'),
                'duration'      => $this->request->getPost('duration'),
                'to_time'       => $this->request->getPost('to_time'),
                'to_date'       => $this->request->getPost('to_date'),
                'from_date'     => $this->request->getPost('from_date'),
                'from_time'     => $this->request->getPost('from_time'),
                'course_id'     => $this->request->getPost('course_id'),
                'batch_id'    => $this->request->getPost('batch_id'),
                'free'          => $this->request->getPost('free'),
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            $response = $this->exam_model->edit($data, ['id' => $id]);
            if ($response){
                session()->setFlashdata('message_success', "Exam Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
            
            return redirect()->to(base_url('admin/exam/index'));

        }
        
        $this->data['course'] = $this->course_model->get()->getResultArray();
        $this->data['batch'] = $this->batch_model->get()->getResultArray();
        $this->data['edit_data'] = $this->exam_model->get(['id' => $id])->getRowArray();

        $this->data['page_title']   = 'Edit Exam';
        $this->data['page_name']    = 'Exam/edit';
        return view('Admin/index', $this->data);  
        
        
        
    }

    public function ajax_view($id){
        $this->data['view_data'] = $this->exam_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Exam/ajax_view', $this->data);
    }

    public function delete($id){
        if ($id > 0){
            if ($this->exam_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Exam Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/exam/index'));
    }
    
    public function get_subject_question(){
        
        $course_id = $this->request->getPost('course_id');
        $selected_subject_id = $this->request->getPost('selected_subject_id');

        $subjects = $this->subject_model->get(['course_id' => $course_id])->getResultArray();
        
        // Initialize an empty string to store the HTML options
        $html_options = "<option value=''>Choose Subject</option>";
        
        foreach ($subjects as $subject) {
            $selected = $selected_subject_id == $subject['id'] ? 'selected' : '' ;
            // Properly concatenate the variables within the string
            $html_options .= "<option value='" . $subject['id'] . "' " . $selected . ">" . $subject['title'] . "</option>";
        }
        
        echo $html_options;
    }
    
    public function get_lesson_question(){
        $subject_id = $this->request->getPost('subject_id');
        $lessons = $this->lesson_model->get(['subject_id' => $subject_id])->getResultArray();
        
        // Initialize an empty string to store the HTML options
        $html_options = "<option value=''>Choose Lessons</option>";
    
        foreach ($lessons as $lesson) {
            // Properly concatenate the variables within the string
            $html_options .= "<option value='" . $lesson['id'] . "'>" . $lesson['title'] . "</option>";
        }
        
        echo $html_options;
    }
    
    public function add_question_to_exam(){
        $checkbox_value     = $this->request->getPost('checkbox_value');
        $data['exam_id']    = $this->request->getPost('exam_id');
        $data['question_id'] = $this->request->getPost('question_id');
        if($checkbox_value==1){
            $if_taken  = $this->exam_questions_model->get(['exam_id' => $data['exam_id'],'question_id' => $data['question_id']])->getNumRows();
            if($if_taken==0){
                $this->exam_questions_model->add($data);
                session()->setFlashdata('message_success', "Exam Updated Successfully!");
            }
        }elseif($checkbox_value==0){
            $this->exam_questions_model->remove(['question_id' => $data['question_id'],'exam_id' => $data['exam_id']]);
            session()->setFlashdata('message_danger', "Deleted Successfully!");
        }
    }
    
    public function remove_exam_questions($exam_id, $question_id){
        
        $this->exam_questions_model->remove(['question_id' => $question_id,'exam_id' => $exam_id]);
        session()->setFlashdata('message_danger', "Deleted Successfully!");
        return redirect()->to(base_url('admin/exam/exam_questions/'.$exam_id));
    }
    
    public function ajax_add_exam_question($exam_id, $category_id=0, $course_id=0, $subject_id=0, $lesson_id=0){
        $this->data['categories']   = $this->category_model->get()->getResultArray();
        $exam_data = $this->exam_model->get(['id' => $exam_id])->getRowArray();
        $exam_category_id = $this->course_model->get(['id' => $exam_data['course_id']])->getRow()->category_id;
        
        $category_id = $category_id>0 ? $category_id : $exam_category_id;
        $course_id = $course_id>0 ? $course_id : $exam_data['course_id'];
        $subject_id = $subject_id>0 ? $subject_id : $exam_data['subject_id'];
        $lesson_id = $lesson_id>0 ? $lesson_id : $exam_data['lesson_id'];
        
        if($category_id>0){
            $this->data['courses']   = $this->course_model->get(['category_id' => $category_id])->getResultArray();
        }else{
            $this->data['courses']   = [];
        }
        
        if($course_id>0){
            $this->data['subjects']   = $this->subject_model->get(['course_id' => $course_id])->getResultArray();
        }else{
            $this->data['subjects']   = [];
        }
        
        if($lesson_id>0){
            $this->data['lessons']   = $this->lesson_model->get(['subject_id' => $subject_id])->getResultArray();
        }else{
            $this->data['lessons']   = [];
        } 
        
        $this->data['exam_id']      = $exam_id;
        $this->data['page_title']   = 'Add Exam Questions';
        $this->data['page_name']    = 'Exam/ajax_add_exam_question';
        $this->data['lesson_id']    = $lesson_id ?? 0;
        $this->data['subject_id']   = $subject_id ?? 0;
        $this->data['course_id']    = $course_id ?? 0;
        $this->data['category_id']  = $category_id ?? 0;
        $this->data['exam_id'] = $exam_id;
        return view('Admin/index', $this->data);
    }
    
    public function add_exam_question(){
        // Upload files and handle the uploaded file data
        $image = $this->upload_file('question_banks', 'title_file');
        $data['title_file'] = $image ? $image['file'] : '';
    
        // $image = $this->upload_file('question_banks', 'hint_file');
        // $data['hint_file'] = $image ? $image['file'] : '';
    
        $image = $this->upload_file('question_banks', 'solution_file');
        $data['solution_file'] = $image ? $image['file'] : '';
    
        // Collecting post data
        $data['lesson_id'] = $this->request->getPost('lesson_id');
        $data['subject_id'] = $this->request->getPost('subject_id');
        $data['course_id'] = $this->request->getPost('course_id');
        $data['category_id'] = $this->request->getPost('category_id');
        // $data['hint'] = $this->request->getPost('hint');
        $data['type'] = $this->request->getPost('type');
        $data['negative_mark'] = $this->request->getPost('negative_mark');
        $data['mark'] = $this->request->getPost('mark');
        // $data['solution'] = 'solution';
    
        if($data['type'] != 3){
            $options = ['a','b','c','d'];
            $data['options'] = json_encode($options);
            if($data['type'] == 1){
                $correct_answer = $this->request->getPost('answer');
            }else{
                $correct_answer = $this->request->getPost('mcq_answer');
            }
            $data['correct_answers'] = json_encode($correct_answer);
        }else{
            $data['range_from'] = $this->request->getPost('range_from');
            $data['range_to'] = $this->request->getPost('range_to');
            // $data['correct_answers'] = json_encode($this->request->getPost('nat_answer'));
            // $data['options'] = json_encode($this->request->getPost('nat_answer'));
        }
    
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['created_by'] = get_user_id(); // You might want to change this to the actual user id
    
        // Insert data into the database
        $inserted_id = $this->question_bank_model->add($data);
        
        if($inserted_id){
            $exam_id = $this->request->getPost('exam_id');
            $exam_question = [
                'exam_id' => $exam_id,
                'question_id' => $inserted_id,
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => get_user_id(),
            ];
            $this->exam_questions_model->add($exam_question);
            session()->setFlashdata('message_success', "Added Successfully!");
        } else {
            session()->setFlashdata('message_success', "Failed!");
        }
        
        $lesson_id = $data['lesson_id'] ?? 0;
        $subject_id = $data['subject_id'] ?? 0;
        $course_id = $data['course_id'] ?? 0;
        $category_id = $data['category_id'] ?? 0;
        $exam_id = $exam_id;
        return redirect()->to(base_url('admin/exam/ajax_add_exam_question/'.$exam_id. '/' .$category_id .'/'. $course_id.'/'. $subject_id.'/'.$lesson_id));
    }
   
   
}
