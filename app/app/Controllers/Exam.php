<?php

namespace App\Controllers;

use App\Controllers\Api\Api;
use App\Models\Course_model;
use App\Models\Enrol_model;
use App\Models\Lesson_file_model;
use App\Models\Subject_model;
use App\Models\Users_model;
use App\Models\Review_model;
use App\Models\Lesson_model;
use App\Models\Practice_attempt_model;
use App\Models\Practice_answer_model;
use App\Models\Question_bank_model;
use App\Models\Payment_model;
use App\Models\Exam_model;
use App\Models\Exam_questions_model;
use App\Models\Exam_attempt_model;
use App\Models\Exam_answer_model;
use App\Models\Quiz_model;



class Exam extends BaseController
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
        $this->practice_attempt_model = new Practice_attempt_model();
        $this->practice_answer_model = new Practice_answer_model();
        $this->question_bank_model = new Question_bank_model();
        $this->payment_model = new Payment_model();
        $this->exam_model = new Exam_model();
        $this->quiz_model = new Quiz_model();
        $this->exam_questions_model = new Exam_questions_model();
        $this->exam_attempt_model = new Exam_attempt_model();
        $this->exam_answer_model = new Exam_answer_model();
        $this->lesson_file_model = new Lesson_file_model();
    }
    
  
  
    // public function practice_web_view($user_id,$course_id){ 
    //     $lesson_id           = $this->request->getGet('lesson_id') ?? [];
    //     $question_no         = $this->request->getGet('question_no');
    //     $attempt_id          = $this->request->getGet('attempt_id');
    //     $data['user_id']     = $user_id;
    //     $data['course_id']   = $course_id;
    //     $data['lesson_id']   = $lesson_id;
    //     $data['question_no'] = $question_no;
    //     $data['attempt_id']  = $attempt_id;
    //     if($user_id > 0){
    //         if($lesson_id == [] && $question_no == 0){
    //             $subjects  = $this->subject_model->get(['course_id' => $course_id])->getResultArray();
    //             $purchase_status = $this->payment_model->user_purchase_status($user_id, $course_id);
    //             foreach($subjects as $key=> $subject){
    //                 $lessons = $this->lesson_model->get(['subject_id' => $subject['id']])->getResultArray();
    //                 $lessons_data = [];
    //                 foreach($lessons as $lesson){
    //                     $lessons_data[] = $this->lesson_model->lesson_data($lesson);
    //                 }
    //                 $subjects[$key]['free'] = $subject['free'] == 'on' ? 'on' : $purchase_status;
    //                 $subjects[$key]['lessons'] = $lessons_data;
                    
    //             }
    //             $data['subjects'] = $subjects;
    //             $data['page_name'] = 'subjects';
    //         }elseif($attempt_id > 0){
    //             $lesson_id = json_decode($this->practice_attempt_model->get(['id' => $attempt_id])->getRow()->lesson_id, true);

    //             $lesson_files = $this->lesson_file_model
    //                 ->get(['lesson_id' => $lesson_id])
    //                 ->getResultArray();

    //             $data['questions'] = [];

    //             foreach ($lesson_files as $keyl => $lesson_file) {
    //                 if ($lesson_file['attachment_type'] == 'quiz') {
    //                     $lesson_files[$keyl]['practice_questions'] = $this->quiz_model
    //                         ->get(
    //                             ['lesson_file_id' => $lesson_file['id']],  // where
    //                             null,                                     // group_by (if you support it)
    //                             ['rand()'],                               // order_by
    //                             $question_no                              // limit
    //                         )
    //                         ->getResultArray();

    //                     // merge into master array
    //                     $data['questions'] = array_merge($data['questions'], $lesson_files[$keyl]['practice_questions']);
    //                 } else {
    //                     $lesson_files[$keyl]['practice_questions'] = [];
    //                 }
    //             }

    //             //dd($data['questions']);
    //             //$data['questions'] =  $this->quiz_model->get(['lesson_id' => $lesson_id], NULL, ['rand()'], $question_no)->getResultArray();

    //             //update practice attempt
    //             $attempt_edit = [
    //                 'start_time' => date('Y-m-d H:i:s'),
    //                 'question_no' => count($data['questions']),
    //                 'question_id' => json_encode(array_column($data['questions'], 'id'))
    //             ];
    //             $this->practice_attempt_model->edit($attempt_edit,['id' => $attempt_id]);
                
    //             $data['practice_details']['questions_count'] = count($data['questions']);
    //             $data['practice_details']['practice_time'] = $data['practice_details']['questions_count'];
    //             $data['page_name']  = 'practice';
    //         }else{
    //             if(is_numeric($lesson_id) && $lesson_id > 0){
    //                 $lesson_id = json_encode([$lesson_id]);
    //             }
    //             $attempt = [
    //                 'user_id'       => $user_id,
    //                 'lesson_id'     => $lesson_id,
    //                 'submit_status' => 0,
    //                 'created_by'    => $user_id,
    //                 'created_at'    => date('Y-m-d H:i:s'),
    //             ];
    //             $practice_attempt_id = $this->practice_attempt_model->add($attempt);
    //             $data['attempt_id'] = $practice_attempt_id;
    //             $data['page_name'] = 'question_count';
    //         }
    //     }
    //     echo view('practice/index', $data);
    // }



    public function practice_web_view_new($user_id,$course_id){ 
        $lesson_id           = $this->request->getGet('lesson_id') ?? [];
        $lesson_file_id      = $this->request->getGet('lesson_file_id');
        $question_no         = $this->request->getGet('question_no');
        $attempt_id          = $this->request->getGet('attempt_id');
        $data['user_id']     = $user_id;
        $data['course_id']   = $course_id;
        $data['lesson_id']   = $lesson_id;
        $data['lesson_file_id'] = $lesson_file_id;
        $data['question_no'] = $question_no;
        $data['attempt_id']  = $attempt_id;
    
    if($user_id > 0){
        if($lesson_file_id > 0){
            // Handle specific quiz file
            $lesson_file = $this->lesson_file_model->get(['id' => $lesson_file_id])->getRowArray();
            if(!$lesson_file || $lesson_file['attachment_type'] != 'quiz'){
                return redirect()->to(base_url("exam/practice_web_view_new/{$user_id}/{$course_id}"));
            }
            
            $lesson_id = $lesson_file['lesson_id'];
            $lesson_name = $this->lesson_model->get(['id' => $lesson_id])->getRow()->title;
            
            // Get questions for this specific quiz file
            $data['questions'] = $this->quiz_model
                ->get(
                    ['lesson_file_id' => $lesson_file_id],
                    null,
                    ['rand()'],
                    $question_no
                )
                ->getResultArray();
            
            // Format questions options
            foreach($data['questions'] as $key => $question) {
                if(isset($question['answers']) && is_string($question['answers'])) {
                    $data['questions'][$key]['options'] = json_decode($question['answers'], true);
                }
            }
            
            // Create practice attempt
            $attempt = [
                'user_id'       => $user_id,
                'lesson_id'     => json_encode([$lesson_id]),
                'lesson_file_id' => $lesson_file_id,
                'submit_status' => 0,
                'created_by'    => $user_id,
                'created_at'    => date('Y-m-d H:i:s'),
            ];
            $practice_attempt_id = $this->practice_attempt_model->add($attempt);
            $data['attempt_id'] = $practice_attempt_id;
            
            // Update practice attempt with questions
            $attempt_edit = [
                'start_time' => date('Y-m-d H:i:s'),
                'question_no' => count($data['questions']),
                'question_id' => json_encode(array_column($data['questions'], 'id'))
            ];
            $this->practice_attempt_model->edit($attempt_edit,['id' => $practice_attempt_id]);
            
            // Required data for quiz UI
            $data['practice_details']['lesson_name'] = $lesson_name;
            $data['practice_details']['questions_count'] = count($data['questions']);
            $data['practice_details']['practice_time'] = $data['practice_details']['questions_count'];
            $data['quiz_id'] = $lesson_file_id;
            $data['user_data'] = $this->users_model->get(['id' => $user_id])->getRowArray();
            $data['page_name'] = 'practice';
        }elseif($lesson_id == [] ){
            $subjects  = $this->subject_model->get(['course_id' => $course_id])->getResultArray();
            $purchase_status = $this->payment_model->user_purchase_status($user_id, $course_id);
            foreach($subjects as $key=> $subject){
                $lessons = $this->lesson_model->get(['subject_id' => $subject['id']])->getResultArray();
                $lessons_data = [];
                foreach($lessons as $lesson){
                    $lessons_data[] = $this->lesson_model->lesson_data($lesson);
                }
                $subjects[$key]['free'] = $subject['free'] == 'on' ? 'on' : $purchase_status;
                $subjects[$key]['lessons'] = $lessons_data;
            }
            $data['subjects'] = $subjects;
            $data['page_name'] = 'subjects';
        }elseif($attempt_id > 0){
            $lesson_id = json_decode($this->practice_attempt_model->get(['id' => $attempt_id])->getRow()->lesson_id, true);
            $lesson_name = $this->lesson_model->get(['id' => $lesson_id])->getRow()->title;

            $lesson_files = $this->lesson_file_model
                ->get(['lesson_id' => $lesson_id])
                ->getResultArray();

            $data['questions'] = [];

            foreach ($lesson_files as $keyl => $lesson_file) {
                if ($lesson_file['attachment_type'] == 'quiz') {
                    $lesson_files[$keyl]['practice_questions'] = $this->quiz_model
                        ->get(
                            ['lesson_file_id' => $lesson_file['id']],
                            null,
                            ['rand()'],
                            //$question_no
                        )
                        ->getResultArray();

                    $data['questions'] = array_merge($data['questions'], $lesson_files[$keyl]['practice_questions']);
                } else {
                    $lesson_files[$keyl]['practice_questions'] = [];
                }
            }

            // Format questions options
            foreach($data['questions'] as $key => $question) {
                if(isset($question['options']) && is_string($question['options'])) {
                    $data['questions'][$key]['options'] = json_decode($question['options'], true);
                }
            }

            // log_message("error",$data['questions']);

            //update practice attempt
            $attempt_edit = [
                'start_time' => date('Y-m-d H:i:s'),
                'question_no' => count($data['questions']),
                'question_id' => json_encode(array_column($data['questions'], 'id'))
            ];
            $this->practice_attempt_model->edit($attempt_edit,['id' => $attempt_id]);
            
            // Required data for quiz UI
            $data['practice_details']['lesson_name'] = $lesson_name;
            $data['practice_details']['questions_count'] = count($data['questions']);
            $data['practice_details']['practice_time'] = $data['practice_details']['questions_count'];
            $data['quiz_id'] = 0; // or get from  if needed
            $data['user_data'] = $this->users_model->get(['id' => $user_id])->getRowArray(); // Get user data
            $data['page_name']  = 'practice';
        }elseif(!empty($lesson_id) && $lesson_id != []){
            // Handle lesson_id - convert to array if it's a single value
            if(is_numeric($lesson_id) && $lesson_id > 0){
                $lesson_id = json_encode([$lesson_id]);
            }
            
            $attempt = [
                'user_id'       => $user_id,
                'lesson_id'     => $lesson_id,
                'lesson_file_id' => $lesson_file_id,
                'submit_status' => 0,
                'created_by'    => $user_id,
                'created_at'    => date('Y-m-d H:i:s'),
            ];
            $practice_attempt_id = $this->practice_attempt_model->add($attempt);
            $data['attempt_id'] = $practice_attempt_id;
            
            // If question_no is provided, redirect to practice page directly
            if($question_no > 0){
                // Redirect to practice page with the new attempt_id
                return redirect()->to(base_url("exam/practice_web_view_new/{$user_id}/{$course_id}?lesson_id={$lesson_id}&attempt_id={$practice_attempt_id}"));
            } else {
                $data['page_name'] = 'question_count';
            }
        }
    }
    echo view('practice_new/index', $data);
}
    
    public function save_practice_result()
    {
        $user_id    = $this->request->getPost('user_id');
        $attempt_id = $this->request->getPost('attempt_id');

        if (!($attempt_id > 0 && $user_id > 0)) {
            return;
        }

        // Get attempt
        $attempt = $this->practice_attempt_model
            ->get(['user_id' => $user_id, 'id' => $attempt_id])
            ->getRowArray();

        if (!$attempt) {
            return;
        }

        // Get posted answers
        $posted_answers = $this->request->getPost('user_answers');
        if (!is_array($posted_answers)) {
            $posted_answers = [];
        }

        // Map to question_id => answer (answer can be "0", "1", ... or array)
        // Avoid array_column because it may drop items without keys; also we want strict handling.
        $user_answers = [];
        foreach ($posted_answers as $row) {
            if (!is_array($row)) continue;
            if (!array_key_exists('question_id', $row)) continue;
            $qid = (string)$row['question_id'];
            $ans = $row['answer'] ?? null; // can be "0", "1", "", null, or array
            $user_answers[$qid] = $ans;
        }

        // Get questions
        $question_id_arr = json_decode($attempt['question_id'], true);
        if (!is_array($question_id_arr)) {
            $question_id_arr = [];
        }

        $questions = $this->quiz_model
            ->get(['id' => $question_id_arr])
            ->getResultArray();

        // Score counters
        $practice_score = [
            'correct'   => 0,
            'incorrect' => 0,
            'skip'      => 0,
        ];

        $question_answer_template = [
            'user_id'    => $user_id,
            'attempt_id' => $attempt_id,
            'created_by' => $user_id,
            'created_at' => date('Y-m-d H:i:s'),
        ];

        $question_answer = [];

        foreach ($questions as $question) {
            $qa = $question_answer_template;
            $qid = (string)$question['id'];
            $qa['question_id'] = $question['id'];

            // --- Correct answers from DB (0-based) ---
            // Support single or multiple answers.
            if (!empty($question['answer_ids'])) {
                $correct_answers = json_decode($question['answer_ids'], true);
            } else {
                // Fallback single answer field
                $correct_answers = [$question['answer_id']];
            }

            // Normalize to array of strings
            $correct_answers = array_map(
                static fn($v) => (string)$v,
                (array)$correct_answers
            );
            sort($correct_answers);
            $qa['answer_correct'] = json_encode($correct_answers);

            // --- User answer (already 0-based from frontend) ---
            $hasUserAnswer = array_key_exists($qid, $user_answers);
            $user_answer   = $hasUserAnswer ? $user_answers[$qid] : null;

            // Detect skip WITHOUT using empty() (because "0" is a valid answer)
            $isSkipped = false;
            if (!$hasUserAnswer) {
                $isSkipped = true;
            } elseif (is_array($user_answer)) {
                // Multi-select: skipped if array is truly empty
                $isSkipped = (count($user_answer) === 0);
            } else {
                // Single-select: skipped only if null or ''
                $isSkipped = ($user_answer === null || $user_answer === '');
            }

            if ($isSkipped) {
                $practice_score['skip']++;
                $qa['answer_status']    = 3; // skipped
                $qa['answer_submitted'] = json_encode([]);
            } else {
                // Normalize user's submission to array of strings
                $user_answer_arr = is_array($user_answer) ? $user_answer : [$user_answer];
                $user_answer_arr = array_map(static fn($v) => (string)$v, $user_answer_arr);
                sort($user_answer_arr);

                if ($user_answer_arr === $correct_answers) {
                    $practice_score['correct']++;
                    $qa['answer_status'] = 1; // correct
                } else {
                    $practice_score['incorrect']++;
                    $qa['answer_status'] = 2; // incorrect
                }

                $qa['answer_submitted'] = json_encode($user_answer_arr);
            }

            $question_answer[] = $qa;
        }

        // Save all answers
        if (!empty($question_answer)) {
            $this->practice_answer_model->add_batch($question_answer);
        }

        // Score: +4 correct, -1 incorrect
        $score = ($practice_score['correct'] * 4) - $practice_score['incorrect'];

        // Time taken
        $start_time = strtotime($attempt['start_time']);
        $end_time   = time();
        $time_taken = gmdate('H:i:s', max(0, $end_time - $start_time));

        // Update attempt
        $this->practice_attempt_model->edit([
            'end_time'      => date('Y-m-d H:i:s'),
            'time_taken'    => $time_taken,
            'correct'       => $practice_score['correct'],
            'incorrect'     => $practice_score['incorrect'],
            'skip'          => $practice_score['skip'],
            'score'         => round($score, 2),
            'submit_status' => 1,
            'updated_by'    => $user_id,
            'updated_at'    => date('Y-m-d H:i:s'),
        ], ['id' => $attempt_id]);
    }



    public function show_practice_result($user_id, $attempt_id){
        $attempt_data = $this->practice_attempt_model->get(['id' => $attempt_id, 'user_id' => $user_id])->getRowArray();
        $question_ids = json_decode($attempt_data['question_id'], true);
        //get user answer
        $data['user_answers'] = $this->practice_answer_model->get_join(
                                [
                                    ['quiz', 'practice_answer.question_id = quiz.id'],
                                ],
                                ['practice_answer.question_id' => $question_ids,'practice_answer.user_id' => $user_id, 'practice_answer.attempt_id' => $attempt_id],
                                ['quiz.question', 'quiz.answers', 'quiz.question_type', 'quiz.answer_id', 'quiz.answer_ids', 'practice_answer.answer_correct', 'practice_answer.answer_submitted', 'practice_answer.question_id', 'practice_answer.answer_status',]
                            )->getResultArray();
        $data['quiz_score']['questions']   = $attempt_data['question_no'];
        $data['quiz_score']['total_mark'] = $attempt_data['question_no']*4;
        $data['quiz_score']['correct']    = $attempt_data['correct'];
        $data['quiz_score']['incorrect']  = $attempt_data['incorrect'];
        $data['quiz_score']['skipped']    = $attempt_data['skip'];
        $data['quiz_score']['score']      = $attempt_data['score'];
        $data['quiz_score']['time_taken'] = $attempt_data['time_taken'];
        //$data['quiz_score']['percentage'] = $data['quiz_score']['total_mark'] > 0  ? max(0, ($attempt_data['score'] / $data['quiz_score']['total_mark'] * 100)): 0; //based on the score and total mark and incorrect reduction
        $data['quiz_score']['percentage'] = $data['quiz_score']['questions'] > 0 
        ? round(($data['quiz_score']['correct'] / $data['quiz_score']['questions']) * 100, 2)
        : 0;  // based on the correct and total questions

        $data['page_name']      = 'result';
        $data['user_id']        = $user_id;
        //$data['course_id']      = $attempt_data['course_id'];
        $data['attempt_id']     = $attempt_id;
        $data['user_data'] = $this->users_model->get(['id' => $user_id])->getRowArray();
        echo view('practice_new/index', $data);
    }
    

   
    public function exam_web_view($exam_id = "", $user_id = "") {
        $data['quiz_details']   = $this->exam_model->get(['id' => $exam_id])->getRowArray();
        $data['questions']      = $this->exam_questions_model->get_exam_question($exam_id);

        $data['quiz_details']['is_attempted']       = $this->exam_attempt_model->get(['exam_id' => $exam_id, 'user_id' => $user_id, 'submit_status' => 1])->getNumRows() > 0 ? 1 : 0;
        $data['quiz_details']['questions_count']    = count($data['questions']);
        // $data['quiz_details']['quiz_time']       = $this->hourMinute2Minutes($data['quiz_details']['duration']);
        $data['quiz_details']['quiz_time']          = count($data['questions']);
        $data['quiz_details']['quiz_marks']         = $data['quiz_details']['questions_count'] * 4;
        $date_now   = strtotime(date('Y-m-d H:i:s'));
        $date_from  = strtotime($data['quiz_details']['from_date'].' '.$data['quiz_details']['from_time']);
        $date_to    = strtotime($data['quiz_details']['to_date'].' '.$data['quiz_details']['to_time']);
        $data['quiz_details']['time']  = $date_from - $date_now;
        // echo"<pre>";print_r($data['quiz_details']);die();
        $duration = $data['quiz_details']['duration'];
        $seconds = $this->duration_to_minutes_seconds($duration);
        $time_data = $this->duration_to_hours_minutes($duration);
        $hours = $time_data['hours'];
        $minutes = $time_data['minutes'];
        
        $data['quiz_details']['total_seconds'] = $seconds['total_seconds'];
        
        $data['quiz_details']['total_time'] = $hours.  ' Hr '. $minutes. ' Min';

        $data['user_id']    = $user_id;
        $data['exam_id']    = $exam_id;
        $data['page_name']  = 'exam';
        echo view('exam/index', $data);
    }
    
    function duration_to_minutes_seconds($duration)
    {
        // list($hours, $minutes, $seconds) = explode(':', $duration);
        // $total_minutes = ($hours * 60) + $minutes;
        // $total_seconds = ($hours * 3600) + ($minutes * 60) + $seconds;
        list($hours, $minutes) = explode(':', $duration);
        $total_minutes = ($hours * 60) + $minutes;
        $total_seconds = ($hours * 3600) + ($minutes * 60);

        return array('total_minutes' => $total_minutes, 'total_seconds' => $total_seconds);
    }

    function duration_to_hours_minutes($duration)
    {
        list($hours, $minutes) = explode(':', $duration);
        // list($hours, $minutes, $seconds) = explode(':', $duration);
        return array('hours' => (int)$hours, 'minutes' => (int)$minutes);
    }
    
    public function exam_save_start(){
        $logger = service('logger');
        $post_data          = $this->request->getPost();
        $logger->error('Database Error: ' . print_r($post_data,true));
        $questions          = $this->exam_questions_model->get(['exam_id' => $post_data['exam_id']])->getResultArray();
        
        $data = [
            'user_id'       => $post_data['user_id'],
            'exam_id'       => $post_data['exam_id'],
            'question_no'   => count($questions),
            'question_id'   => json_encode(array_column($questions, 'question_id')),
            'start_time'    => date('Y-m-d H:i:s'),
            'submit_status' => 0,
            'created_by'    => $post_data['user_id'],
            'created_at '   => date('Y-m-d H:i:s'),
        ];
        $attempt_id = $this->exam_attempt_model->add($data);
        echo json_encode(['status' => 1, 'message' => 'Success', 'attempt_id' => $attempt_id]);
    }

    public function exam_save_result(){
        if($this->request->getPost('attempt_id') > 0 && $this->request->getPost('user_id') > 0){
            //get quiz attempt
            $attempt = $this->exam_attempt_model->get([
                'user_id'   => $this->request->getPost('user_id'),
                'id'        => $this->request->getPost('attempt_id')
            ])->getRowArray();
            
            
            //get user answers
            $user_answers = $this->request->getPost('user_answers');
            $logger = service('logger');
            $logger->error('Database Error: ' . print_r($user_answers,true));
            
            //get questions
            $question_id_arr = json_decode($attempt['question_id'], true);
 
            $questions = $this->exam_questions_model->get_join([
                            ['question_bank', 'exam_questions.question_id = question_bank.id'],
                          ], ['exam_questions.question_id' => $question_id_arr, 'exam_questions.exam_id' => $attempt['exam_id']])->getResultArray();
            
            //order user answer
            $user_answers = array_column($user_answers, 'answer', 'question_id');
            

            //check answer
            $quiz_score['correct']    = 0;
            $quiz_score['incorrect']  = 0;
            $quiz_score['skip']       = 0;
            $quiz_score['score']      = 0;

            $question_answer = [];
            $answer['user_id']      = $this->request->getPost('user_id');
            $answer['attempt_id']   = $this->request->getPost('attempt_id');
            $answer['exam_id']      = $attempt['exam_id'];
            $answer['created_at']     = $this->request->getPost('user_id');
            $answer['created_by']     = date('Y-m-d H:i:s');

            foreach($questions as $key => $question){
                $question_answer[$key]                      = $answer;
                $question_answer[$key]['question_id']       = $question['id'];
                $question_answer[$key]['answer_correct']    = $question['correct_answers'];
                // $question_answer[$key]['mark']              = 4;
                // $question_answer[$key]['negative_mark']     = 1;

                $correct_answers = json_decode($question['correct_answers'], true);

                if(empty($user_answers[$question['id']])){
                    $quiz_score['skip'] += 1;
                    $question_answer[$key]['answer_status']     = 3;
                    $question_answer[$key]['answer_submitted']  = json_encode([]);

                }else{
                    if($correct_answers[0] == $user_answers[$question['id']][0]){
                        $quiz_score['correct'] += 1;
                        $question_answer[$key]['answer_status']     = 1;
                        $question_answer[$key]['answer_submitted']  = $question['correct_answers'];
                    }else{
                        $question_answer[$key]['answer_submitted']  = json_encode([$user_answers[$question['id']]]);
                        $question_answer[$key]['answer_status']     = 2;
                        $quiz_score['incorrect'] += 1;
                    }
                    
                }
                
                //calculate quiz score
                if ($question_answer[$key]['answer_status'] == 1){
                    $quiz_score['score'] += $question['mark'] ?? 4;
                }elseif ($question_answer[$key]['answer_status'] == 2){
                    $quiz_score['score'] -= $question['negative_mark'] ?? 1;
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
            
            //calculate score
            // $quiz_score['score'] = $quiz_score['correct'] * 4 - $quiz_score['incorrect'];

            //update attempt
            $this->exam_attempt_model->edit([
                'end_time'      => date('Y-m-d H:i:s'),
                'time_taken'    => $timeDifference,
                'correct'       => $quiz_score['correct'],
                'incorrect'     => $quiz_score['incorrect'],
                'skip'          => $quiz_score['skip'],
                'score'         => $quiz_score['score'],
                'submit_status' => 1,
                'updated_by'    => $this->request->getPost('user_id'),
                'updated_at '   => date('Y-m-d H:i:s'),
            ],['id' => $attempt['id']]);
        }
        echo json_encode(['status' => 1, 'message' => 'Success', 'data' => []]);
    }

    public function exam_show_result($user_id, $exam_id){
        $data['user_data'] = $this->users_model->get(['id' => $user_id])->getRowArray();
        $data['quiz_details']   = $this->exam_model->get(['id' => $exam_id])->getRowArray();
        $data['attempt']        = $this->exam_attempt_model->get(['exam_id' => $exam_id, 'user_id' => $user_id, 'submit_status' => 1],NULL, ['id' => 'desc'],1)->getRowArray();;
        
        //get user answer
        $joins = [
                ['question_bank', 'exam_answer.question_id = question_bank.id'],
                ['exam_questions', 'exam_answer.question_id = exam_questions.question_id']
                // Add more joins if needed
            ];
            
        // Define the select fields, including the sum of duration
        $select = [
                'exam_answer.id', 'question_bank.title', 'question_bank.title_file', 'question_bank.solution',
                'question_bank.solution_file', 'question_bank.is_equation', 'question_bank.is_equation_solution',
                'question_bank.options', 'question_bank.correct_answers',
                'exam_answer.answer_correct', 'exam_answer.answer_submitted', 'exam_answer.question_id',
                'exam_answer.answer_status',
            ];
            
        $where = ['exam_answer.question_id' => json_decode($data['attempt']['question_id'], true) ,
                 'exam_answer.user_id' => $user_id ,
                 'exam_answer.exam_id' => $exam_id ,
                 'exam_questions.exam_id' => $exam_id ,
                 'exam_answer.attempt_id' => $data['attempt']['id']];
        
        $data['user_answers'] = $this->exam_answer_model->get_join($joins, $where, $select)->getResultArray();
         

        $data['quiz_score']['quetions']   = $data['attempt']['question_no'];
        $data['quiz_score']['total_mark'] = $data['attempt']['question_no']*4;
        $data['quiz_score']['correct']    = $data['attempt']['correct'];
        $data['quiz_score']['incorrect']  = $data['attempt']['incorrect'];
        $data['quiz_score']['skipped']    = $data['attempt']['skip'];
        $data['quiz_score']['score']      = $data['attempt']['score'];
        $data['quiz_score']['time_taken'] = $data['attempt']['time_taken'];
        $data['quiz_score']['percentage'] = $data['attempt']['score'] >0 ? round($data['attempt']['score']/$data['quiz_score']['total_mark']*100) : 0;

        $data['page_name']      = 'result';
        $data['user_id']        = $user_id;
        $data['exam_id']        = $exam_id;
        echo view('exam/index', $data);
    }
    
    
}
