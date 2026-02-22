<?php

namespace App\Controllers;

use App\Controllers\Api\Api;
use App\Models\Course_model;
use App\Models\Enrol_model;
use App\Models\Subject_model;
use App\Models\Users_model;
use App\Models\Review_model;
use App\Models\Lesson_model;
use App\Models\Lesson_file_model;
use App\Models\Exam_model;
use App\Models\Exam_questions_model;
use App\Models\Exam_attempt_model;
use App\Models\Exam_answer_model;
use App\Models\Question_bank_model;
use App\Models\Payment_model;
use App\Models\Quiz_model;

class Quiz extends BaseController
{
    private $users_model;
    private $user;
    private $role_model;


    public function __construct()
    {
        $this->users_model = new Users_model();
        $this->course_model = new Course_model();
        $this->enrol_model = new Enrol_model();
        $this->subject_model = new Subject_model();
        $this->users_model = new Users_model();
        $this->review_model = new Review_model();
        $this->lesson_model = new Lesson_model();
        $this->lesson_file_model = new Lesson_file_model();
        $this->exam_model = new Exam_model();
        $this->exam_questions_model = new Exam_questions_model();
        $this->exam_attempt_model = new Exam_attempt_model();
        $this->exam_answer_model = new Exam_answer_model();
        $this->question_bank_model = new Question_bank_model();
        $this->quiz_model = new Quiz_model();
    }
    
  
    public function index($user_id, $exam_id){
        $exam_data            = $this->lesson_file_model->get(['id' => $exam_id])->getRowArray();
        $data['title']        = $exam_data['title'] ?? '';
        // Use regular expressions to extract the content between <li> and </li>
        preg_match_all('/<li>(.*?)<\/li>/', $exam_data['summary'], $matches);
        
        // Initialize an empty array to store the result
        $instructions = [];
        
        foreach ($matches[1] as $item) {
            $instructions[] = $item; // Add each matched item as an array element
        }

        $data['instructions'] = $instructions ?? '';
        $data['user_id']      = $user_id;
        $data['exam_id']      = $exam_id;
        
        $data['user']         = $this->users_model->get(['id' => $user_id])->getRowArray();
        $data['questions']    = count($this->quiz_model->get_quiz_questions($exam_id));
        log_message('error', 'Questions: ' . print_r($data, true));
        echo view('quiz/index', $data);
    }
     
    
    public function start_quiz($user_id, $exam_id){
        $exam_data     = $this->lesson_file_model->get(['id' => $exam_id])->getRowArray();        
        // $date_now   = strtotime(date('Y-m-d H:i:s'));
        // $date_from  = strtotime($exam_data['from_date'].' '.$exam_data['from_time']);
        // $date_to    = strtotime($exam_data['to_date'].' '.$exam_data['to_time']);
        // $data['exam']['time']  = $date_from - $date_now;

        $data['title'] = $exam_data['title'] ?? '';
        $data['exam']  = $exam_data;
        $questions     = $this->quiz_model->get_quiz_questions($exam_id);
        $data['exam']['questions'] = $questions;
        $data['exam']['questions_count'] = count($questions);
        // $logger = service('logger');
        // $logger->error('Database Error: ' . print_r($data['exam'],true));

        
        $attempt_data = [
            'user_id'       => $user_id,
            'exam_id'       => $exam_id,
            'question_no'   => count($questions),
            'question_id'   => json_encode(array_column($questions, 'id')),
            'start_time'    => date('Y-m-d H:i:s'),
            'submit_status' => 0,
            'created_by'    => $user_id,
            'created_at '   => date('Y-m-d H:i:s'),
        ];
        $attempt_id = $this->exam_attempt_model->add($attempt_data);
        $data['user_id']    = $user_id;
        $data['exam_id']    = $exam_id;
        $data['attempt_id'] = $attempt_id;
        $data['user'] = $this->users_model->get(['id' => $user_id])->getRowArray();
        echo view('quiz/quiz_start', $data);
    }
    
    public function save_quiz_result(){
        $exam_id = $this->request->getPost('exam_id');
        $user_id = $this->request->getPost('user_id');
        $attempt_id = $this->request->getPost('attempt_id'); 
            
        if($exam_id > 0 && $user_id > 0){
            //get quiz attempt
            $attempt = $this->exam_attempt_model->get([
                'user_id'   => $user_id,
                'id'        => $attempt_id
            ])->getRowArray();

            //get user answers
            $user_answers = $this->request->getPost('user_answers');

            //get questions
            $question_id_arr = json_decode($attempt['question_id'], true);
 
            $questions = $this->quiz_model->whereIn('id', $question_id_arr)
                                         ->where('lesson_file_id', $attempt['exam_id'])
                                         ->findAll();
            
            //order user answer
            $user_answers = array_column($user_answers, 'answer', 'question_id');
            $logger = service('logger');
            $logger->error('Database Error: ' . print_r($user_answers,true));
        
            //check answer
            $quiz_score['correct']    = 0;
            $quiz_score['incorrect']  = 0;
            $quiz_score['skip']       = 0;
            $quiz_score['score']      = 0;

            $question_answer = [];
            $answer['user_id']      = $user_id;
            $answer['attempt_id']   = $attempt_id;
            $answer['exam_id']      = $attempt['exam_id'];
            $answer['created_by']   = $user_id;
            $answer['created_at']   = date('Y-m-d H:i:s');
            
            foreach($questions as $key => $question){
                $question_answer[$key]                      = $answer;
                $question_answer[$key]['question_id']       = $question['id'];
                
                // Get correct answers based on question type
                if($question['question_type'] == 0) {
                    // Single answer question
                    $correct_answers = [$question['answer_id']];
                    $question_answer[$key]['answer_correct'] = json_encode($correct_answers);
                } else {
                    // Multiple answer question
                    $correct_answers = json_decode($question['answer_ids'], true);
                    $question_answer[$key]['answer_correct'] = $question['answer_ids'];
                }

                if(empty($user_answers[$question['id']])){
                    $quiz_score['skip'] += 1;
                    $question_answer[$key]['answer_status']     = 3;
                    $question_answer[$key]['answer_submitted']  = json_encode([]);
                }else{ 
                    $user_answer = $user_answers[$question['id']];
                    $is_correct = false;
                    
                    if($question['question_type'] == 0) {
                        // Single answer - check if user answer matches correct answer
                        $is_correct = ($correct_answers[0] == $user_answer[0]);
                    } else {
                        // Multiple answers - check if arrays are equal
                        sort($user_answer);
                        sort($correct_answers);
                        $is_correct = ($user_answer === $correct_answers);
                    }
                    
                    if($is_correct){
                        $quiz_score['correct'] += 1;
                        $question_answer[$key]['answer_status']     = 1;
                        $question_answer[$key]['answer_submitted']  = json_encode($user_answer);
                    }else{
                        $question_answer[$key]['answer_submitted']  = json_encode($user_answer);
                        $question_answer[$key]['answer_status']     = 2;
                        $quiz_score['incorrect'] += 1;
                    }
                }
            } 
            $this->exam_answer_model->add_batch($question_answer);
            
            // Convert timestamps to Unix timestamps
            $from_date = strtotime($attempt['start_time']);
            $todate = strtotime(date('Y-m-d H:i:s'));
    
            // Calculate the difference in seconds
            $differenceInSeconds = $todate - $from_date;
    
            // Format the difference as H:i:s
            $timeDifference = gmdate('H:i:s', $differenceInSeconds);
            
            // calculate score
            // $quiz_score['score'] = $quiz_score['correct'] * 4 - $quiz_score['incorrect'];
            $quiz_score['score'] = $quiz_score['correct'] * 1;
            
            $percentage = ($quiz_score['correct']/$attempt['question_no'])*100;
            
            //update attempt
            $this->exam_attempt_model->edit([
                'end_time'      => date('Y-m-d H:i:s'),
                'time_taken'    => $timeDifference,
                'correct'       => $quiz_score['correct'],
                'incorrect'     => $quiz_score['incorrect'],
                'skip'          => $quiz_score['skip'],
                'score'         => $quiz_score['score'],
                // 'submit_status' => round($percentage) > 79  ? 1 : 0,
                'submit_status' => 1,
                'updated_by'    => $user_id,
                'updated_at '   => date('Y-m-d H:i:s'),
            ],['id' => $attempt['id']]);
             
        }
        
        $lesson_id = $this->lesson_file_model->get(['id' => $exam_id])->getRow()->lesson_id;
        echo json_encode(['status' => 1, 'message' => 'Success', 'user_id' => $user_id, 'exam_id' => $exam_id, 'attempt_id' => $attempt_id]);
    }
    

    public function show_quiz_result($user_id, $exam_id, $attempt_id){
        $this->question_bank_model = new Question_bank_model();
        $data['user_data'] = $this->users_model->get(['id' => $user_id])->getRowArray();
        $data['exam_details'] = $this->lesson_file_model->get(['id' => $exam_id])->getRowArray();
        $data['exam_questions'] =  $this->quiz_model->get_quiz_questions($exam_id);
        $data['attempt'] = $this->exam_attempt_model->get(['id' => $attempt_id, 'exam_id' => $exam_id, 'user_id' => $user_id], [], ['id' => 'desc'], 1)->getRowArray();
        
        if(empty($data['attempt'])){
            return redirect()->to(base_url('quiz/index/'.$user_id.'/'.$exam_id));
        }
        $question_ids = json_decode($data['attempt']['question_id'], true);
        
        //get user answer
        $data['user_answers'] = $this->exam_answer_model->get_join(
            [
                ['quiz', 'exam_answer.question_id = quiz.id'],
                ['exam_attempt', 'exam_answer.attempt_id = exam_attempt.id'],
            ],
            ['exam_answer.question_id' => $question_ids,'exam_answer.user_id' => $user_id, 'exam_answer.exam_id' => $exam_id, 'exam_answer.attempt_id' => $data['attempt']['id']],
            ['exam_answer.id', 'quiz.question as title', 'quiz.question_type', 'quiz.answers as options', 'quiz.answer_id', 'quiz.answer_ids', 'exam_answer.answer_correct', 'exam_answer.answer_submitted', 'exam_answer.question_id', 'exam_answer.answer_status',],
            [],
            [],
            ['exam_answer.question_id']
        )->getResultArray();
        
         
        $data['user_id']    = $user_id;
        $data['exam_id']    = $exam_id;
        echo view('quiz/result', $data);
    }
      
}
