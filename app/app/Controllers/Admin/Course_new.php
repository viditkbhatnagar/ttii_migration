<?php
namespace App\Controllers\Admin;
use App\Models\Course_model;
use App\Models\Category_model;
use App\Models\Subject_model;
use App\Models\Lesson_model;
use App\Models\Topic_model;
use App\Models\Quiz_model;

use App\Models\Lesson_file_model;
use App\Models\Enrol_model;
use App\Models\Users_model;
use App\Models\Batch_model;
use App\Models\Batch_students_model;
use App\Models\Instructor_enrol_model;

class Course_new extends AppBaseController
{
    private $course_model;
    private $category_model;
    private $subject_model;
    private $lesson_model;
    private $topic_model;
    private $quiz_model;
    private $lesson_file_model;
    private $enrol_model;
    private $users_model;
    private $batch_model;
    private $batch_students_model;
    private $instructor_enrol_model;


    protected $is_syncing = false;

    public function __construct()
    {
        parent::__construct();
        $this->course_model = new Course_model();
        $this->category_model = new Category_model();
        $this->subject_model = new Subject_model();
        $this->lesson_model = new Lesson_model();
        $this->topic_model = new Topic_model();
        $this->quiz_model = new Quiz_model();
        $this->lesson_file_model = new Lesson_file_model();
        $this->enrol_model = new Enrol_model();
        $this->users_model = new Users_model();
        $this->batch_model = new Batch_model();
        $this->batch_students_model = new Batch_students_model();
        $this->instructor_enrol_model = new Instructor_enrol_model();

    }

    public function index($subject_id = 0){
        
        $this->data['courses'] = $this->course_model->get([],['id','title'],['id','desc'])->getResultArray();
        if($subject_id){
            $selected_subject = $this->subject_model->get(['id' => $subject_id],['id','course_id', 'title'])->getRow();
            $this->data['selected_subject'] = $subject_id;
            $this->data['selected_course'] = $selected_subject->course_id;

            $lessons = $this->lesson_model->get(['subject_id'=>$subject_id],['id', 'title', 'course_id', 'subject_id'],['order','asc'])->getResultArray();
            foreach($lessons as $key => $lesson){
                $lesson_files = $this->lesson_file_model->get(['lesson_id' => $lesson['id']],null,['order'=>'asc'])->getResultArray();
                foreach($lesson_files as $keyl => $lesson_file){
                    if($lesson_file['attachment_type'] == 'quiz'){
                        $lesson_files[$keyl]['practice_questions'] = $this->quiz_model->get(['lesson_file_id' => $lesson_file['id']])->getResultArray();
                    }else{
                        $lesson_files[$keyl]['practice_questions'] = [];
                    }
                }
                $lessons[$key]['lesson_files'] = $lesson_files;
            }
            $this->data['lessons'] = $lessons;
        }
        // echo"<pre>";print_r($this->data);die();
        // log_message('error', print_r($this->data,true));
        $this->data['page_title'] = 'Course';
        $this->data['page_name'] = 'Course_new/index';
        return view('Admin/index', $this->data);
    }
    
    public function get_subjects(){
        $course_id = $this->request->getGet('course_id');
        $subjects_data = $this->subject_model->get(['course_id' => $course_id],['id', 'title'])->getResultArray();
        echo json_encode($subjects_data);
    }
    
    

    public function ajax_add_quiz($lesson_id){
        $this->data['lesson_id'] = $lesson_id;
        echo view('Admin/Course_new/ajax_add_quiz', $this->data);
    }
    
    public function add_quiz($lesson_id = null)
    {
        // Check if the form is submitted
        if ($this->request->getMethod() === 'post') 
        {
            // Get form data
            $title = $this->request->getPost('title');
            $summary = $this->request->getPost('editor');
            $lesson_type = $this->request->getPost('lesson_type');
            $attachment_type = $this->request->getPost('attachment_type');
            $questions = $this->request->getPost('questions'); // This will be JSON from JS
            
            // Validate required fields
            if (empty($title) || empty($summary) || empty($questions)) {
                session()->setFlashdata('message_danger', "Please fill all required fields!");
                return redirect()->to($_SERVER['HTTP_REFERER']);
            }
    
            try {
                // Prepare lesson file data
                $lessonFileData = [
                    'lesson_id' => $lesson_id,
                    'title' => $title,
                    'summary' => $summary,
                    'lesson_type' => $lesson_type,
                    'attachment_type' => $attachment_type,
                    'video_id' => 0,
                    'created_at' => date('Y-m-d H:i:s'),
                    'created_by' => get_user_id() // Replace with your auth helper
                ];
    
                // Insert into lesson_files table
                $file_id = $this->lesson_file_model->add($lessonFileData);
    
                if (!$file_id) {
                    throw new \Exception('Failed to save quiz header information');
                }
    
                // Process questions
                $questions = json_decode($questions, true);
                
                foreach ($questions as $question) {
                    $answers = [];
                    $correctAnswers = [];
                    
                    // Prepare answers and correct answers
                    foreach ($question['options'] as $index => $option) {
                        $answers[] = $option['text'];
                        if ($option['is_correct']) {
                            $correctAnswers[] = $index;
                        }
                    }
    
                    $quizData = [
                        'lesson_file_id' => $file_id,
                        'question' => $question['text'],
                        'question_type' => ($question['type'] === 'multiple') ? 1 : 0,
                        'answers' => json_encode($answers),
                        'created_at' => date('Y-m-d H:i:s'),
                        'updated_at' => date('Y-m-d H:i:s'),
                        'created_by' => get_user_id()
                    ];
    
                    // Set correct answer(s)
                    if ($question['type'] === 'multiple') {
                        $quizData['answer_ids'] = json_encode($correctAnswers);
                    } else {
                        $quizData['answer_id'] = $correctAnswers[0] ?? null;
                    }
    
                    // Insert into quiz table
                    if (!$this->quiz_model->add($quizData)) {
                        throw new \Exception('Failed to save quiz questions');
                    }
                }
                session()->setFlashdata('message_success', "Quiz added Successfully!");
                return redirect()->to(base_url("admin/course_new/index"));
    
            } catch (\Exception $e) {
                log_message('error', 'Quiz creation failed: ' . $e->getMessage());
                session()->setFlashdata('message_danger', "Something went wrong please try again!");
                return redirect()->to($_SERVER['HTTP_REFERER']);
            }
        }
    
        // For GET request - show form
        if (!empty($lesson_id)) {
            $this->data['lesson_id'] = $lesson_id;
        } else {
            session()->setFlashdata('message_danger', "Lesson ID is required");
            return redirect()->to($_SERVER['HTTP_REFERER']);
        }
    
         return redirect()->to(base_url('admin/course_new/index'));
    }
    

    public function ajax_add_question($lesson_id=null,$lesson_file_id =null)
    {
        $this->data['lesson_id'] = $lesson_id;
        $this->data['lesson_file_id'] = $lesson_file_id;
        echo view('Admin/Course_new/ajax_add_question', $this->data);
    }

    public function add_question($lesson_id,$lesson_file_id)
    {
        // Validate lesson
        $lesson = $this->lesson_model->get(['id' => $lesson_id])->getRowArray();
        if (!$lesson) {
            session()->setFlashdata('message_danger', "Invalid Lesson ID!");
            return redirect()->to(base_url('admin/course_new/index'));
        }

        // Get form inputs
        $question      = $this->request->getPost('question');
        $questionType  = $this->request->getPost('question_type');
        $answers       = $this->request->getPost('answers');

        // Sanitize & encode answers
        $answersJson = json_encode(array_map('trim', $answers));

        // Handle answer IDs
        if ($questionType == '0') {
            // Single answer
            $answerId     = $this->request->getPost('answer_id');
            $answerIdJson = $answerId;
            $answerIdsJson = null;
        } else {
            // Multiple answers
            $answerIds     = $this->request->getPost('answer_ids') ?? [];
            $answerIdJson  = null;
            $answerIdsJson = json_encode($answerIds);
        }

        // Prepare data
        $quizData = [
            'lesson_file_id' => $lesson_file_id,
            'question'      => $question,
            'question_type' => $questionType,
            'answers'       => $answersJson,
            'answer_id'     => $answerIdJson,
            'answer_ids'    => $answerIdsJson,
            'created_at'    => date('Y-m-d H:i:s'),
            'created_by'    => get_user_id()
        ];

        // Insert into DB
        $response = $this->quiz_model->add($quizData);

        if ($response) {
            $this->quiz_model->edit(['master_quiz_id' => $response], ['id' => $response]);
            $this->propagate_new_child_addition('quiz', $response);
            session()->setFlashdata('message_success', "Question Added Successfully!");
        } else {
            session()->setFlashdata('message_danger', "Something went wrong! Try Again.");
        }

        return redirect()->to($_SERVER['HTTP_REFERER']);
    }



    public function ajax_edit_question($id){
        $this->data['edit_data'] = $this->quiz_model->get(['id' => $id])->getRowArray();
        // echo"<pre>";print_r($this->data);die();
        echo view('Admin/Course_new/ajax_edit_question', $this->data);
    }
    
    public function edit_question(){
        $id = $this->request->getPost('id');
        if (!$id) {
            session()->setFlashdata('message_danger', "Invalid request!");
            return redirect()->to(base_url('admin/course_new/index'));
        }
    
        $question = $this->request->getPost('question');
        $questionType = $this->request->getPost('question_type');
        $answers = $this->request->getPost('answers');
    
        // Sanitize and encode answers
        $answersJson = json_encode(array_map('trim', $answers));
    
        // Store selected answers
        if ($questionType == '0') {
            // Single answer
            $answerId = $this->request->getPost('answer_id');
            $answerIdJson = $answerId; // Can be saved as plain int or json_encode(int)
            $answerIdsJson = null;
        } else {
            // Multiple answers
            $answerIds = $this->request->getPost('answer_ids') ?? [];
            $answerIdJson = null;
            $answerIdsJson = json_encode($answerIds);
        }
    
        // Prepare data
        $quizData = [
            'question' => $question,
            'question_type' => $questionType,
            'answers' => $answersJson,
            'answer_id' => $answerIdJson,
            'answer_ids' => $answerIdsJson,
            'updated_at' => date('Y-m-d H:i:s') // optional
        ];
        $response = $this->quiz_model->edit($quizData, ['id' => $id]);
        if ($response) {
            $this->propagate_quiz_question_update($id);
            session()->setFlashdata('message_success', "Question Updated Successfully!");
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to($_SERVER['HTTP_REFERER']);
    }
    
    // public function delete_question($id){
    //     if ($id > 0){
    //         if ($this->quiz_model->remove(['id' => $id])){
    //             session()->setFlashdata('message_success', "Question Deleted Successfully!");
    //         }else{
    //             session()->setFlashdata('message_danger', "Something went wrong! Try Again");
    //         }
    //     }else{
    //         session()->setFlashdata('message_danger', "Something went wrong! Try Again");
    //     }
    //     return redirect()->to($_SERVER['HTTP_REFERER']);
    // }

    public function delete_question($id)
    {
        if ($id <= 0) {
            session()->setFlashdata('message_danger', "Invalid Question ID!");
            return redirect()->to($_SERVER['HTTP_REFERER']);
        }

        // Fetch the original question
        $question = $this->quiz_model->get(['id' => $id])->getRowArray();
        if (!$question) {
            session()->setFlashdata('message_danger', "Question not found!");
            return redirect()->to($_SERVER['HTTP_REFERER']);
        }

        // Identify the master group (quiz or question)
        $group_master_id = $question['master_quiz_id'] ?? $question['id'];

        // Fetch all related (master + cloned) questions
        $group_questions = $this->quiz_model
            ->get([
                'OR' => [
                    'master_quiz_id' => $group_master_id,
                    'id' => $group_master_id
                ]
            ])
            ->getResultArray();

        if (empty($group_questions)) {
            session()->setFlashdata('message_danger', "No related questions found!");
            return redirect()->to($_SERVER['HTTP_REFERER']);
        }
 
        // Delete all questions in the group
        foreach ($group_questions as $q) {
            $this->quiz_model->remove(['id' => $q['id']]);
        }

        session()->setFlashdata('message_success', "Question(s) deleted successfully!");
        return redirect()->to($_SERVER['HTTP_REFERER']);
    }




    public function ajax_add(){
        
        $this->data['category'] = $this->category_model->get(['parent'=>0])->getResultArray();
               $this->data['instructor'] =  $this->users_model->get(['role_id'=>3])->getResultArray();

        echo view('Admin/Course_new/ajax_add', $this->data);
    }
    
    
    public function add($id=null)
    {
        // Check if the form is submitted
        if ($this->request->getMethod() === 'post') 
        {
            $title = $this->request->getPost('title');
            $description = $this->request->getPost('description');
            $is_free_course = ($this->request->getPost('is_free_course') == '0') ? 0 : 1; // Adjust to handle the radio button properly
            $price = $this->request->getPost('price');
            $sale_price = $this->request->getPost('sale_price');
            
            if($is_free_course == 1)
            {
                $price = 0;
                $sale_price = 0;
            }
        
            // Insert the course data into the database
            $courseData = [
                'title' => $title,
                'description' => $description,
                'is_free_course' => $is_free_course,
                'price' => $price,
                'sale_price' => $sale_price,
                 'total_amount' => $sale_price
            ];
            
            if(!empty($_FILES['thumbnail']))
            {
                // Handle file upload for thumbnail
                $thumbnail = $this->upload_file('course', 'thumbnail');
                if ($thumbnail && valid_file($thumbnail['file'])) {
                    $courseData['thumbnail'] = $thumbnail['file'];
                }
            }
                
            // Save course data and get the course_id
            $courseId = $this->course_model->add($courseData);
            return redirect()->to(base_url('admin/course_new/add_details/'.$courseId));

        }
        
        if(!empty($id))
        {
            $this->data['edit_data'] = $this->course_model->get(['id' => $id])->getRowArray();
            $this->data['course_id'] = $id;
        }
        else
        {
            $this->data['course_id'] = '';
            $this->data['edit_data'] = [];
        }
    
        // Prepare data for view
        $this->data['page_title'] = 'Add Course';
        $this->data['page_name'] = 'Course_new/add';
    
        return view('Admin/index', $this->data);
    }
    
    public function edit($id)
    {
        if ($this->request->getMethod() === 'post')
        {
            $title = $this->request->getPost('title');
            $description = $this->request->getPost('description');
            $is_free_course = ($this->request->getPost('is_free_course') == '0') ? 0 : 1; // Adjust to handle the radio button properly
            $price = $this->request->getPost('price');
            $sale_price = $this->request->getPost('sale_price');
            
             if($is_free_course == 1)
            {
                $price = 0;
                $sale_price = 0;
            }
        
            // Insert the course data into the database
            $courseData = [
                'title' => $title,
                'description' => $description,
                'is_free_course' => $is_free_course,
                'price' => $price,
                'sale_price' => $sale_price,
                'total_amount' => $sale_price

            ];
            
            if(!empty($_FILES['thumbnail']))
            {
                // Handle file upload for thumbnail
                $thumbnail = $this->upload_file('course', 'thumbnail');
                if ($thumbnail && valid_file($thumbnail['file'])) {
                    $courseData['thumbnail'] = $thumbnail['file'];
                }
            }
            
          
            
            $response = $this->course_model->edit($courseData, ['id' => $id]);
            if ($response)
            {
                return redirect()->to(base_url('admin/course_new/add_details/'.$id));

                session()->setFlashdata('message_success', "Course Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/course_new/index'));
    }
    
    
    public function add_details($id)
    {
        // Check if the form is submitted
        if ($this->request->getMethod() === 'post') 
        {
            $title = $this->request->getPost('title');
            $description = $this->request->getPost('description');
            $is_free_course = ($this->request->getPost('is_free_course') == 'paid') ? 0 : 1; // Adjust to handle the radio button properly
            $price = $this->request->getPost('price');
            $sale_price = $this->request->getPost('sale_price');
        
            // Insert the course data into the database
            $courseData = [
                'title' => $title,
                'description' => $description,
                'is_free_course' => $is_free_course,
                'price' => $price,
                'sale_price' => $sale_price
            ];
            
            // Handle file upload for thumbnail
            $thumbnail = $this->upload_file('course', 'thumbnail');
            if ($thumbnail && valid_file($thumbnail['file'])) {
                $courseData['thumbnail'] = $thumbnail['file'];
            }
            
            // Save course data and get the course_id
            $courseId = $this->course_model->add($courseData);
        }
        else
        {
            $this->data['edit_data'] = [];
            $this->data['form_submitted'] = false;
        }
        
        $this->data['subjects'] = $this->subject_model->get(['course_id'=>$id])->getResultArray();
        $this->data['lessons'] = $this->lesson_model->get(['course_id'=>$id],null,['order','asc'])->getResultArray();
        $this->data['topics'] = $this->topic_model->get(['course_id'=>$id],null,['order','asc'])->getResultArray();

    
        // Prepare data for view
        $this->data['course_id'] = $id;

        $this->data['page_title'] = 'Add Course';
        $this->data['page_name'] = 'Course_new/add_details';
    
        return view('Admin/index', $this->data);
    }


//     public function add()
//     {
//         if ($this->request->getMethod() === 'post'){
//             $discounted_price = $this->request->getPost('discounted_price');
//             $discount_flag = $discounted_price != 0 ? 1 : 0; 
//             $data = [
                
//                 'title' => $this->request->getPost('title'),
//                 'description' => $this->request->getPost('description'),
//                     'price' => $this->request->getPost('price'),
//                 'duration' => $this->request->getPost('duration'),
//                 'instructor_id' => $this->request->getPost('instructor_id'),

                
//                 'status' => 'Active',
//                 'features'=> $this->request->getPost('features'),
//                 'is_free_course' => ($this->request->getPost('is_free_course') == 1) ? 1 : 0,
//                 'is_featured' => ($this->request->getPost('is_featured') == 1) ? 1 : 0,
//                 'discounted_price' => $discounted_price,
//                 'discount_flag' => $discount_flag,
//                 'created_by' => get_user_id(),
//                 'created_at' => date('Y-m-d H:i:s'),
            
//             ];
           
           
        			
//         	$thumbnail = $this->upload_file('course','thumbnail');
//             if($thumbnail && valid_file($thumbnail['file'])){
// 				$data['thumbnail'] = $thumbnail['file'];
// 			}
            
//             $course_id = $this->course_model->add($data);
           
//             if ($course_id)
//             {
                
//                 session()->setFlashdata('message_success', "Course Added Successfully!");
                
//             }
//             else
//             {
//                 session()->setFlashdata('message_danger', "Something went wrong! Try Again");
//             }
//         }
//         return redirect()->to(base_url('admin/course/index'));
//     }

    public function ajax_edit($id){
        $this->data['category'] = $this->category_model->get(['parent'=>0])->getResultArray();
                $this->data['instructor'] =  $this->users_model->get(['role_id'=>3])->getResultArray();

        $this->data['edit_data'] = $this->course_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Course_new/ajax_edit', $this->data);
    }
    
//     public function edit($id)
//     {
//         if ($this->request->getMethod() === 'post'){
//             $discount_price = $this->request->getPost('discounted_price');
//             $discount_flag = $discount_price != 0 ? 1 : 0; 
//             $data = [
                
//                 'title' => $this->request->getPost('title'),
//                 'description' => $this->request->getPost('description'),
                
//                  'price' => $this->request->getPost('price'),


//                 'duration' => $this->request->getPost('duration'),

//                 'instructor_id' => $this->request->getPost('instructor_id'),


                
//                 'status' => 'Active',
//                 'is_free_course' => ($this->request->getPost('is_free_course') == 1) ? 1 : 0,
//                 'is_featured' => ($this->request->getPost('is_featured') == 1) ? 1 : 0,
//                 'features'=> $this->request->getPost('features'),
//                 'discounted_price' => $discount_price,
//                 'discount_flag' => $discount_flag,

     
//                 'updated_by' => get_user_id(),
//                 'updated_at' => date('Y-m-d H:i:s'),
//             ];
            
          
          
        			
//         	$thumbnail = $this->upload_file('course','thumbnail');
//             if($thumbnail && valid_file($thumbnail['file'])){
// 				$data['thumbnail'] = $thumbnail['file'];
// 			}
            
//             $response = $this->course_model->edit($data, ['id' => $id]);
//             if ($response){
//                 session()->setFlashdata('message_success', "Course Updated Successfully!");
//             }else{
//                 session()->setFlashdata('message_danger', "Something went wrong! Try Again");
//             }
//         }
//         return redirect()->to(base_url('admin/course/index'));
//     }

    public function ajax_view($id){
        $this->data['view_data'] = $this->course_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Course_new/ajax_view', $this->data);
    }

    // public function delete($id){
    //     if ($id > 0){
    //         if ($this->course_model->remove(['id' => $id])){
    //             session()->setFlashdata('message_success', "Course Deleted Successfully!");
    //         }else{
    //             session()->setFlashdata('message_danger', "Something went wrong! Try Again");
    //         }
    //     }else{
    //         session()->setFlashdata('message_danger', "Something went wrong! Try Again");
    //     }
    //     return redirect()->to(base_url('admin/course/index'));
    // }
    
    public function delete($id){
        if ($id > 0){
            $subjects = $this->subject_model->get(['course_id'=>$id],null)->getResultArray();
            foreach ($subjects as $subject) {
                $lessons = $this->lesson_model->get(['subject_id'=>$subject['id']],null)->getResultArray();
                foreach ($lessons as $lesson) {
                    $files = $this->lesson_file_model->get(['lesson_id' => $lesson['id']])->getResultArray();
                    foreach ($files as $file) {
                        $this->lesson_file_model->remove(['id' => $file['id']]);
                    }
                    $this->lesson_model->remove(['id' => $lesson['id']]);
                }
                $this->subject_model->remove(['id' => $subject['id']]);
            }
            $enrolled = $this->enrol_model->get(['course_id'=>$id],null)->getResultArray();
            foreach($enrolled as $enroll){
                $this->enrol_model->remove(['course_id' => $id]);
            }
            if ($this->course_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Course Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/course_new/index'));
    }
    
    public function details($id)
    {
        $this->data['category'] = $this->category_model->get(['parent'=>0])->getResultArray();
        $logger = service('logger');

        $this->data['subjects'] = $this->subject_model->get(['course_id'=>$id],null,['order'=>'asc'])->getResultArray();
        

        $this->data['lessons'] = $this->lesson_model->get(['course_id'=>$id],null,['order','asc'])->getResultArray();
        $this->data['edit_data'] = $this->course_model->get(['id' => $id])->getRowArray();
        $this->data['course_id'] = $id;
         
        $this->data['page_title'] = 'Course Details';
        $this->data['page_name'] = 'Course_new/details';
        return view('Admin/index', $this->data);
    }
    
    public function enrolled_students($id)
    {
        $this->data['list_items'] = $this->enrol_model->get_join(
            [
                ['users', 'users.id = enrol.user_id'],
            ],['enrol.course_id' => $id],[' users.id','users.name','users.email','users.country_code','users.phone','enrol.created_at']
        )->getResultArray();
        // echo '<pre>';
        // print_r(db_connect()->getLastQuery());die();
                
        $this->data['course_id'] =  $id;
        $this->data['page_title'] = 'Enrolled Students';
        $this->data['page_name'] = 'Course_new/students';
        return view('Admin/index', $this->data);
    }
    
    
    public function change_status($id)
    {
        $status = $this->request->getGet('status');
        
        $data = [
            'status' => $status,
            'updated_by' => get_user_id(),
            'updated_at' => date('Y-m-d H:i:s'),
        ];
        
        $response = $this->course_model->edit($data, ['id' => $id]);
        if ($response){
            session()->setFlashdata('message_success', "Status changed successfully!");
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        
        return redirect()->to(base_url('admin/course_new/index'));
    }
    
    
    
    public function ajax_add_subject($id){
        $this->data['course_id'] = $id;
        echo view('Admin/Course_new/ajax_add_subject', $this->data);
    }
    
    public function ajax_add_lesson($id){
         $this->data['subjects'] = $this->subject_model->get(['course_id'=>$id])->getResultArray();
        $this->data['course_id'] = $id;
        echo view('Admin/Course_new/ajax_add_lesson', $this->data);
    }
    
    public function add_lesson(){
        $course = $this->request->getPost('course_id');
        if ($this->request->getMethod() === 'post'){
                $data = [
                    'title' => $this->request->getPost('title'),
                    'course_id' => $this->request->getPost('course_id'),
                    'subject_id' => $this->request->getPost('subject_id'),
                    'summary' => $this->request->getPost('summary'),
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
    			
                $cat_id = $this->lesson_model->add($data);
                if ($cat_id){
                    session()->setFlashdata('message_success', "Lesson Added Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
           
        }
        return redirect()->to(base_url('admin/course_new/add_details/'.$course));
    }
    
    public function batch($id){
        
        $this->data['list_items'] = $this->batch_model->get(['course_id'=>$id],null,['id'=>'desc'])->getResultArray();

        $this->data['page_title'] = 'Batch';
        $this->data['page_name'] = 'Course_new/batch';
        return view('Admin/index', $this->data);
    }
    
    //  public function faq($id){
        
    //     $this->data['list_items'] = $this->faq_model->get(['course_id'=>$id],null,['id'=>'desc'])->getResultArray();
    //     $this->data['course_id'] = $id;
    //     $this->data['page_title'] = 'FAQ';
    //     $this->data['page_name'] = 'Course/faq';
    //     return view('Admin/index', $this->data);
    // }
    
     public function ajax_add_faq($id){
        $this->data['course_id'] = $id;
        echo view('Admin/Course_new/ajax_add_faq', $this->data);
    }
    
    
    
    public function students($id){
        
        $this->data['list_items'] = $this->batch_students_model->get_join(
                                    [
                                        ['users', 'users.id = batch_students.user_id'],
                                    ],['batch_students.batch_id' => $id,'users.role_id' => 2],['batch_students.id','users.name','users.phone']
                                    )->getResultArray();
                    

        $course = $this->course_model->get()->getResultArray();
        $this->data['course'] = array_column($course, 'title', 'id');
        $this->data['batch_id'] = $id;
        $this->data['page_title'] = 'Batch Students';
        $this->data['page_name'] = 'Course_new/students';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add_sudent($batch){

        $course =  $this->batch_model->get(['id' => $batch])->getRowArray();
        
        $course_id = $course['course_id'];
        
        $allstudents =  $this->enrol_model->get_join(
                                    [
                                        ['users', 'users.id = enrol.user_id'],
                                    ],['enrol.course_id' => $course_id,'users.role_id' => 2],['users.id','users.name','users.phone']
                                    )->getResultArray();
                                    
                                    
        $existing = $this->batch_students_model->get_join(
                                    [
                                        ['users', 'users.id = batch_students.user_id'],
                                    ],['batch_students.batch_id' => $batch,'users.role_id' => 2],['users.id','users.name','users.phone']
                                    )->getResultArray();
                                    
        // Extract user IDs of existing students
        $existingIds = array_column($existing, 'id');
        
        // Filter students who are not already assigned to the batch
        $this->data['students'] = array_filter($allstudents, function($student) use ($existingIds) {
            return !in_array($student['id'], $existingIds);
        });

                                    

                                    
        $this->data['batch_id'] = $batch;
                                    
    
        echo view('Admin/Course_new/ajax_add_sudent', $this->data);
    }
    
    
    public function add_student_to_batch()
    {
        $batch_id = $this->request->getPost('batch_id');
        if ($this->request->getMethod() === 'post'){
            
         
                $data = [
                    'batch_id' => $this->request->getPost('batch_id'),
                    'user_id' => $this->request->getPost('user_id'),

                    'created_by' => get_user_id(),
                    'updated_by' => get_user_id(),

                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
                
                
    			
                $cat_id = $this->batch_students_model->add($data);
                if ($cat_id){
                    session()->setFlashdata('message_success', "Lesson Added Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
           
        }
        return redirect()->to(base_url('admin/course_new/students/'.$batch_id));
    }
    
    
    public function delete_from_batch($id){
        if ($id > 0){
            
            $batch =  $this->batch_students_model->get(['id' => $id])->getRowArray();
            $batch_id = $batch['batch_id'];
            
            if ($this->batch_students_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Course Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/course_new/students/'.$batch_id));
    }
    
    public function delete_from_enrol($user_id, $course_id){
        if ($user_id > 0){
            
            if ($this->enrol_model->remove(['user_id' => $user_id, 'course_id' => $course_id])){
                session()->setFlashdata('message_success', "Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/course_new/enrolled_students/'.$course_id));
    }
    
    
    public function get_course_by_category()
    {
        $category_id = $this->request->getPost('category_id');
        $courses = $this->course_model->get(['category_id' => $category_id])->getResultArray();
    
        $options = '<select><option value="">Choose Course</option>';
    
        if (!empty($courses)) {
            foreach ($courses as $course) {
                $selected = ($course['id'] == $this->request->getPost('selected_course_id')) ? 'selected' : '';
                $options .= '<option value="' . $course['id'] . '" ' . $selected . '>' . $course['title'] . '</option>';
            }
        }
    
        $options .= '</select>';
        echo $options;
    }
    
    
    public function get_electives()
    {
        $course_id = $this->request->getPost('course_id');
        $subjects = $this->subject_model->get(['course_id' => $course_id,'subject_type' => 2])->getResultArray();
        
        if (!empty($subjects)) {
            $options = '';
            foreach ($subjects as $sub) {
                $selected = ($sub['id'] == $this->request->getPost('selected_subject_id')) ? 'selected' : '';
                $options .= '<option value="' . $sub['id'] . '" ' . $selected . '>' . $sub['title'] . '</option>';
            }
        } else {
            $options = ''; // If no subjects, return empty string
        }
        
        echo $options;  // Return the options only
    }

    protected function propagate_new_child_addition(string $type, int $new_id)
    {
        if ($this->is_syncing) return;
        $this->is_syncing = true;

        switch ($type) {

            case 'quiz':
                $orig = $this->quiz_model->get(['id' => $new_id])->getRowArray();
                if (!$orig) break;

                // Get parent lesson file details
                $lesson_file = $this->lesson_file_model
                    ->get(['id' => $orig['lesson_file_id']])
                    ->getRowArray();

                if (!$lesson_file) break;

                $group_master_id = $lesson_file['master_lesson_file_id'] ?? $lesson_file['id'];

                // Fetch all lesson files linked to the same master file (including master)
                $group_files = $this->lesson_file_model
                    ->get([
                        'OR' => [
                            'master_lesson_file_id' => $group_master_id,
                            'id' => $group_master_id
                        ]
                    ])
                    ->getResultArray();


                $processed_files = [];

                foreach ($group_files as $f) {
                    if (in_array($f['id'], $processed_files)) continue;
                    $processed_files[] = $f['id'];

                    if ($f['id'] == $orig['lesson_file_id']) continue;

                    //  Prevent duplicate clones
                    $exists = $this->quiz_model
                        ->get([
                            'master_quiz_id' => $orig['master_quiz_id'] ?? $new_id,
                            'lesson_file_id' => $f['id']
                        ])
                        ->getRowArray();

                    if ($exists) continue;

                    //  Clone quiz question
                    $clone = $orig;
                    unset($clone['id']);
                    $clone['lesson_file_id'] = $f['id'];
                    $clone['master_quiz_id'] = $orig['master_quiz_id'] ?? $new_id;
                    $clone['created_at'] = date('Y-m-d H:i:s');
                    $clone['updated_at'] = date('Y-m-d H:i:s');
                    $clone['created_by'] = get_user_id();

                    $this->quiz_model->add($clone);
                }

                break;
        }

        $this->is_syncing = false;
    }





    protected function propagate_quiz_question_update(int $question_id, array $updated_fields = [])
    {
        if ($this->is_syncing) return;
        $this->is_syncing = true;

        // 1️⃣ Fetch original question
        $orig = $this->quiz_model->get(['id' => $question_id])->getRowArray();
        if (!$orig) { 
            $this->is_syncing = false; 
            return; 
        }

        // 2️⃣ Identify master group
        $group_master_id = $orig['master_quiz_id'] ?? $orig['id'];

        // Fetch all linked clones
        $group_questions = $this->quiz_model
            ->get(['master_quiz_id' => $group_master_id])
            ->getResultArray();

        // If the current question is a clone, include its master
        if ($group_master_id != $question_id) {
            $master_q = $this->quiz_model->get(['id' => $group_master_id])->getRowArray();
            if ($master_q) $group_questions[] = $master_q;
        }

        // 3️⃣ If no explicit updates passed, use all fields except linkage and system columns
        if (empty($updated_fields)) {
            $updated_fields = $orig;
            unset(
                $updated_fields['id'],
                $updated_fields['created_by'],
                $updated_fields['created_at'],
                $updated_fields['updated_at'],
                $updated_fields['lesson_file_id'],        // each course/lesson may have its own quiz link
                $updated_fields['order'],                // independent question order
                $updated_fields['master_quiz_id']    // keep clone linkage
            );
        }

        // 4️⃣ Propagate updates to all questions in the same sync group
        foreach ($group_questions as $q) {
            if ($q['id'] == $question_id) continue;

            $to_update = $updated_fields;
            $to_update['updated_at'] = date('Y-m-d H:i:s');
            $this->quiz_model->edit($to_update, ['id' => $q['id']]);
        }

        $this->is_syncing = false;
    }

    
}
