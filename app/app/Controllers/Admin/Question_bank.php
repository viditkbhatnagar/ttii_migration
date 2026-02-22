<?php
namespace App\Controllers\Admin;
use App\Models\Question_bank_model;
use App\Models\Category_model;
use App\Models\Course_model;
use App\Models\Subject_model;
use App\Models\Lesson_model;
use App\Models\Lesson_file_model;
use App\Models\Exam_questions_model;

class Question_bank extends AppBaseController
{
    private $question_bank_model;
    public function __construct()
    {
        parent::__construct();
        $this->question_bank_model = new Question_bank_model();
        $this->category_model = new Category_model();
        $this->course_model = new Course_model();
        $this->subject_model = new Subject_model();
        $this->lesson_model = new Lesson_model();
        $this->lesson_file_model = new Lesson_file_model();
        $this->exam_questions_model = new Exam_questions_model();
    }

    public function index(){
        
        $this->data['list_items'] = $this->question_bank_model->get(null,null,['id' => 'desc'])->getResultArray();
        $this->data['page_title'] = 'Question Bank';
        $this->data['page_name'] = 'Question_bank/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add($exam_id = 0){
        $this->data['exam_id']   = $exam_id;
        if($exam_id > 0){
            $exam_data = $this->lesson_file_model->get(['attachment_type' => 'quiz', 'id' => $exam_id])->getRowArray();
            $lesson_data = $this->lesson_model->get(['id' => $exam_data['lesson_id']])->getRowArray();
            $course_data = $this->course_model->get(['id' => $lesson_data['course_id']])->getRowArray();
            $this->data['lesson_id']  = $exam_data['lesson_id'];
            $this->data['subject_id'] = $lesson_data['subject_id'];
            $this->data['course_id']  = $lesson_data['course_id'];
            $this->data['category_id']  = $course_data['category_id'];
            $this->data['courses'] = $this->course_model->get(['category_id' => $course_data['category_id']])->getResultArray();
            $this->data['subjects'] = $this->subject_model->get(['course_id' => $lesson_data['course_id']])->getResultArray();
            $this->data['lessons'] = $this->lesson_model->get(['subject_id' => $lesson_data['subject_id']])->getResultArray();
        }else{
            $this->data['lesson_id']  = 0;
            $this->data['subject_id'] = 0;
            $this->data['course_id']  = 0;
            $this->data['category_id']  = 0;
            $this->data['courses'] = [];
            $this->data['subjects'] = [];
            $this->data['lessons'] = [];
        }
        $this->data['categories']   = $this->category_model->get()->getResultArray();
        $this->data['courses'] = $this->course_model->get()->getResultArray();
        echo view('Admin/Question_bank/ajax_add', $this->data);
    }

    public function add(){
        
        // log_message('error','$_POST '.print_r($_POST,true));
         $image = $this->upload_file('question_banks','title_file');
            if($image){
    			$data['title_file'] = $image['file'];
    		}else{
    		    $data['title_file'] = '';
    		}
    		
        $image = $this->upload_file('question_banks','hint_file');
            if($image){
    			$data['hint_file'] = $image['file'];
    		}else{
    		    $data['hint_file'] = '';
    		}
    		
        $image = $this->upload_file('question_banks','solution_file');
            if($image){
    			$data['solution_file'] = $image['file'];
    		}else{
    		    $data['solution_file'] = '';
    		}
        
        $exam_id = $this->request->getPost('exam_id');
        $data['lesson_id']          = $this->request->getPost('lesson_id');
        $data['subject_id']         = $this->request->getPost('subject_id');
        $data['course_id']          = $this->request->getPost('course_id');
        $data['category_id']        = $this->request->getPost('category_id');
        $data['hint']               = $this->request->getPost('hint');
        $data['is_equation']        = $this->request->getPost('is_equation');
    
        if($this->request->getPost('is_equation')==1){
            $data['title'] = $this->request->getPost('title_equation');
        }else{
            $data['title'] = $this->request->getPost('title');
        }
    
          $data['is_equation_solution']        = $this->request->getPost('is_equation_solution');
    
          if($this->request->getPost('is_equation_solution')==1){
              $data['solution'] = $this->request->getPost('solution_equation');
          }else{
              $data['solution'] = $this->request->getPost('solution');
          }
            
            log_message('error','$data '.print_r($data,true));
    
        $data['number_of_options']      = $this->request->getPost('number_of_options');
        $data['q_type']                 = 1;
        $data['options']                = json_encode($this->request->getPost('option'));
        $data['correct_answers']        = json_encode($this->request->getPost('correct'));
        $data['created_at']          = date('Y-m-d H:i:s');
        $data['created_by']          = 1;
        // $data['updated_by']          = $this->user_id;
        
        // log_message('error',print_r($data,true));
    
        $inserted_id = $this->question_bank_model->add($data);
        if($inserted_id){
            if($exam_id > 0){
                $question['exam_id']    = $exam_id;
                $question['question_id'] = $inserted_id;
                $if_taken  = $this->exam_questions_model->get(['exam_id' => $exam_id,'question_id' => $inserted_id])->getNumRows();
                if($if_taken==0){
                    $this->exam_questions_model->add($question);
                }
                return redirect()->to(base_url('admin/exam/exam_questions/'.$exam_id));
            }else{
                return redirect()->to(base_url('admin/question_bank/index'));
            }
            session()->setFlashdata('message_success', " Added Successfully!");
        }else{
            session()->setFlashdata('message_success', "Failed!");
        }
        return redirect()->to(base_url('admin/question_bank/index'));
    }

    public function ajax_edit($id){
        $this->data['categories']   = $this->category_model->get()->getResultArray();
        $this->data['courses'] = $this->course_model->get()->getResultArray();
        $this->data['edit_data'] = $this->question_bank_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Question_bank/ajax_edit', $this->data);
    }

    public function edit($id){
            if ($this->request->getMethod() === 'post'){
                $image = $this->upload_file('question_banks','title_file');
                if($image){
        			$data['title_file'] = $image['file'];
        		}else{
        		    $data['title_file'] = '';
        		}
        		
            $image = $this->upload_file('question_banks','hint_file');
                if($image){
        			$data['hint_file'] = $image['file'];
        		}else{
        		    $data['hint_file'] = '';
        		}
        		
            $image = $this->upload_file('question_banks','solution_file');
                if($image){
        			$data['solution_file'] = $image['file'];
        		}else{
        		    $data['solution_file'] = '';
        		}
            
            
            $data['lesson_id']          = $this->request->getPost('lesson_id');
            $data['subject_id']         = $this->request->getPost('subject_id');
            $data['course_id']          = $this->request->getPost('course_id');
            $data['category_id']        = $this->request->getPost('category_id');
            $data['hint']               = $this->request->getPost('hint');
            $data['is_equation']        = $this->request->getPost('is_equation');
        
            if($this->request->getPost('is_equation')==1){
                $data['title'] = $this->request->getPost('title_equation');
            }else{
                $data['title'] = $this->request->getPost('title');
            }
        
              $data['is_equation_solution']        = $this->request->getPost('is_equation_solution');
        
              if($this->request->getPost('is_equation_solution')==1){
                  $data['solution'] = $this->request->getPost('solution_equation');
              }else{
                  $data['solution'] = $this->request->getPost('solution');
              }
                
            $data['number_of_options']      = $this->request->getPost('number_of_options');
            $data['q_type']                 = 1;
            $data['options']                = json_encode($this->request->getPost('option'));
            $data['correct_answers']        = json_encode($this->request->getPost('correct'));
            $data['updated_at']          = date('Y-m-d H:i:s');
            $data['updated_by']          = 1;
            
            log_message('error','$_POST '.print_r($_POST,true));
            log_message('error','$data '.print_r($data,true));
        
            $inserted_id = $this->question_bank_model->edit($data,['id' => $id]);
            if($inserted_id){
                session()->setFlashdata('message_success', " Updated Successfully!");
            }else{
                session()->setFlashdata('message_success', "Failed!");
            }
            return redirect()->to(base_url('admin/question_bank/index'));
            }
        
    }

    public function ajax_view($id){
        $this->data['view_data'] = $this->question_bank_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Designation/ajax_view', $this->data);
    }

    public function delete($id){
        if ($id > 0){
            if ($this->question_bank_model->remove(['id' => $id])){
                $this->exam_questions_model->remove(['question_id' => $id]);
                session()->setFlashdata('message_success', "Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/question_bank/index'));
    }
    public function get_subjects(){
        $course_id = $this->request->getPost('course_id');
        $subjects = $this->subject_model->get(['course_id' => $course_id])->getResultArray();
    
        // Initialize the select options HTML with the "Choose Subject" option
        $options = '<select><option value="">Choose Subject</option>';
    
        // If there are subjects available, append them to the options
        if (!empty($subjects)) {
            foreach ($subjects as $subject) {
                // Check if the subject ID matches the one sent via AJAX
                $selected = ($subject['id'] == $this->request->getPost('selected_subject_id')) ? 'selected' : '';
                $options .= '<option value="' . $subject['id'] . '" ' . $selected . '>' . $subject['title'] . '</option>';
            }
        }
    
        // Close the select tag
        $options .= '</select>';
    
        // Pass the options to the view
        echo $options;
    }

    public function get_lessons(){
        $course_id = $this->request->getPost('course_id');
        $lessons = $this->lesson_model->get(['course_id' => $course_id])->getResultArray();
        $options = '<select><option value="">Choose Lessons</option>';
        if (!empty($lessons)) {
            foreach ($lessons as $lesson) {
                // Check if the lesson ID matches the one sent via AJAX
                $selected = ($lesson['id'] == $this->request->getPost('selected_lesson_id')) ? 'selected' : '';
                $options .= '<option value="' . $lesson['id'] . '" ' . $selected . '>' . $lesson['title'] . '</option>';
            }
        }
    
        // Close the select tag
        $options .= '</select>';
    
        // Pass the options to the view
        echo $options;
}

  
}
