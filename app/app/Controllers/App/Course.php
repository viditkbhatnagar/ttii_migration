<?php
namespace App\Controllers\App;
use App\Controllers\App\UserBaseController;
use App\Models\Course_model;
use App\Models\Category_model;
use App\Models\Users_model;
use App\Models\Subject_model;
use App\Models\Stories_model;
use App\Models\Payment_model;
use App\Models\Exam_model;
use App\Models\Live_class_model;
use App\Models\Enrol_model;
class Course extends UserBaseController
{
    private $course_model;
    private $category_model;
    private $users_model;
    private $subject_model;
    private $stories_model;
    private $payment_model;
    private $exam_model;
    private $live_class_model;
    private $enrol_model;

    public function __construct()
    {
        parent::__construct();
        $this->course_model = new Course_model();
        $this->category_model = new Category_model();
        $this->users_model = new Users_model();
        $this->subject_model = new Subject_model();
        $this->stories_model = new Stories_model();
        $this->payment_model = new Payment_model();
        $this->exam_model = new Exam_model();
        $this->live_class_model = new Live_class_model();
        $this->enrol_model = new Enrol_model();
    }
    
    
    public function my_course() {
        $user_id = get_user_id();
        
        // Fetch user's enrolled courses
        $enrolments = $this->enrol_model->get(['user_id' => $user_id])->getResultArray();
        $course_ids = array_column($enrolments, 'course_id');
        
        // Fetch all courses
        $courses = $this->course_model->get()->getResultArray();
        
        $enrolled_courses = [];
        $other_courses = [];
        $exam_array = [];
        
        foreach ($courses as &$course) {
            $course_id = $course['id'];
            $is_enrolled = in_array($course_id, $course_ids);
            
            // Process course data
            $course_data = $this->course_model->course_data((array)$course);
            
            // Fetch subjects for the course
            $subjects = $this->subject_model->get(['course_id' => $course_id], ['id', 'title', 'course_id', 'thumbnail', 'icon', 'free'])->getResultArray();
            $course_purchase_status = $this->payment_model->user_purchase_status($user_id, $course_id);
            $course_data['free'] = $course['is_free_course'] == 1 ? 'on' : $course_purchase_status;
            
            // Process subjects
            foreach ($subjects as &$subject) {
                $subject_purchase_status = $this->payment_model->user_purchase_status($user_id, $course_id, $subject['id']);
                $subject['thumbnail'] = valid_file($subject['thumbnail']) ? base_url(get_file($subject['thumbnail'])) : '';
                $subject['icon'] = valid_file($subject['icon']) ? base_url(get_file($subject['icon'])) : '';
                $subject['free'] = $subject['free'] == 'on' ? 'on' : $subject_purchase_status;
            }
            
            // Add subjects to course data
            $course_data['subjects'] = $subjects;
            
            // Categorize courses
            if ($is_enrolled) {
                $enrolled_courses[] = $course_data;
            } else {
                $other_courses[] = $course_data;
            }
            
            // Fetch upcoming exams
            $upcoming_exams = $this->exam_model->get_upcoming_exams($course_id);
            foreach ($upcoming_exams as $upcoming_exam) {
                $exam_array[] = [
                    'id' => $upcoming_exam['id'] ?? '',
                    'title' => $upcoming_exam['title'] ?? '',
                    'description' => $upcoming_exam['description'] ?? '',
                    'category_id' => $upcoming_exam['category_id'] ?? '',
                    'course_id' => $upcoming_exam['course_id'] ?? '',
                    'section_id' => $upcoming_exam['section_id'] ?? '',
                    'lesson_id' => $upcoming_exam['lesson_id'] ?? '',
                    'is_practice' => $upcoming_exam['is_practice'] ?? '',
                    'from_date' => $upcoming_exam['from_date'] ?? '',
                    'from_time' => $upcoming_exam['from_time'] ?? '',
                    'to_date' => $upcoming_exam['to_date'] ?? '',
                    'to_time' => $upcoming_exam['to_time'] ?? '',
                    'duration' => $upcoming_exam['duration'] ?? '',
                    'free' => $upcoming_exam['free'] == 1 ? 'on' : $purchase_status,
                    'publish_result' => $upcoming_exam['publish_result'],
                    'exam_link' => '+918921750312',
                    'syllabus' => 'https://tourism.gov.in/sites/default/files/2019-04/dummy-pdf_2.pdf'
                ];
            }
        }
        
        // Fetch primary course data
        $primary_course = $this->users_model->get(['id' => $user_id])->getRow()->course_id;
        $primary_course_data = $this->course_model->get(['id' => $primary_course])->getRow();
        
        $psubjects = [];
        if (!empty($primary_course_data)) {
            $course_data = $this->course_model->course_data($primary_course_data);
            $psubjects = $this->subject_model->get(['course_id' => $primary_course], ['id', 'title', 'course_id', 'thumbnail', 'icon', 'free'])->getResultArray();
            
            foreach ($psubjects as &$subject) {
                $subject_purchase_status = $this->payment_model->user_purchase_status($user_id, $primary_course, $subject['id']);
                $subject['thumbnail'] = valid_file($subject['thumbnail']) ? base_url(get_file($subject['thumbnail'])) : '';
                $subject['icon'] = valid_file($subject['icon']) ? base_url(get_file($subject['icon'])) : '';
                $subject['free'] = $subject['free'] == 'on' ? 'on' : $subject_purchase_status;
            }
        }
        
        // Prepare data for view->
        $this->data = [
            'courses' => $enrolled_courses,
            'other_courses' => $other_courses,
            'primary_course_subjects' => $psubjects,
            'practice_link' => base_url('exam/practice_web_view/' . $user_id),
            'upcoming_exams' => $exam_array,
            'upcoming_live' => $this->live_class_model->upcoming_live_class_data($user_id, $course_id),
            'phone' => '+918921750312',
            'page_title' => 'My Course',
            'page_name' => 'Dashboard/my_course'
        ];
        
        return view('App/index', $this->data);
    }
    
    /*** My Course ***/
    public function my_course_old()
    {
        $course_id = $this->users_model->get(['id' => get_user_id()])->getRow()->course_id;
        $primary_course = $this->course_model->get(['id' => $course_id])->getRow();
            
        if(!empty($primary_course))
        {
        
            $course_data = $this->course_model->course_data($primary_course);
            // echo "<pre>";
            // print_r($course_data['id']);die();
            // $stories = $this->stories_model->get(['course_id' => $course_id, 'date' => date('Y-m-d'), 'status' => 1])->getResultArray();
            $stories = $this->stories_model->get_stories($course_id);
            $story_data = [];
            foreach($stories as $story){
                $story_data[] = $this->stories_model->story_data($story);
            }
            
            $subjects = $this->subject_model->get(['course_id' => $course_id],['id','title','course_id','thumbnail','icon','free'])->getResultArray();
            $purchase_status = $this->payment_model->user_purchase_status(get_user_id(), $course_id);
            
            
            foreach($subjects as $key=> $subject){
                $subject_purchase_status = $this->payment_model->user_purchase_status(get_user_id(), $course_id, $subject['id']);
                $subjects[$key]['thumbnail'] = valid_file($subject['thumbnail']) ? base_url(get_file($subject['thumbnail'])) : '';
                $subjects[$key]['icon'] = valid_file($subject['icon']) ? base_url(get_file($subject['icon'])) : '';
                $subjects[$key]['free'] = $subject['free'] == 'on' ? 'on' : $subject_purchase_status;
            }
    
            $upcoming_exams = $this->exam_model->get_upcoming_exams($course_id);
            $exam_array = [];
            foreach($upcoming_exams as $upcoming_exam){
                $items = [];
                $items['id'] = $upcoming_exam['id'] ??'';
                $items['title'] = $upcoming_exam['title'] ??'';
                $items['description'] = $upcoming_exam['description'] ??'';
                $items['category_id'] = $upcoming_exam['category_id'] ??'';
                $items['course_id'] = $upcoming_exam['course_id'] ??'';
                $items['section_id'] = $upcoming_exam['section_id'] ??'';
                $items['lesson_id'] = $upcoming_exam['lesson_id'] ??'';
                $items['is_practice'] = $upcoming_exam['is_practice'] ??'';
                $items['from_date'] = $upcoming_exam['from_date'] ??'';
                $items['from_time'] = $upcoming_exam['from_time'] ??'';
                $items['to_date'] = $upcoming_exam['to_date'] ??'';
                $items['to_time'] = $upcoming_exam['to_time'] ??'';
                $items['duration'] = $upcoming_exam['duration'] ??'';
                $items['free'] = $upcoming_exam['free'] == 1 ? 'on' : $purchase_status;
                $items['publish_result'] = $upcoming_exam['publish_result'];
                $items['exam_link'] = '+918921750312';
                $items['syllabus'] = 'https://tourism.gov.in/sites/default/files/2019-04/dummy-pdf_2.pdf';
                $exam_array[] = $items;
            }
            
            $upcoming_lives = $this->live_class_model->upcoming_live_class_data(get_user_id(), $course_id);
        }
        else
        {
            $story_data = [];
            $subjects = [];
            $course_data = [];
            $exam_array = [];
            $upcoming_lives = [];
            
            
        }
        
        $this->data = [
            'courses'   => $course_data ?? [],
            'subjects' => $subjects,
            'practice_link' => base_url('exam/practice_web_view/'.get_user_id()),
            'upcoming_exams' => $exam_array,
            'upcoming_live' => $upcoming_lives,
            'phone' => '+918921750312'
        ];
        
        // echo "<pre>"; print_r($this->data);die();
        
        $this->data['page_title'] = 'My Course';
        $this->data['page_name'] = 'Dashboard/my_course';
        return view('App/index', $this->data);
    }
    
    /*** Enrolled Course ***/
    public function enrolled_courses(){
        $enrolments = $this->enrol_model->get(['user_id' => get_user_id()])->getResultArray();
        $course_ids = array_column($enrolments,'course_id');
        $courses = $this->course_model->get(['id' => $course_ids])->getResultArray();
        $this->data['enrolled_courses'] = [];
        foreach($courses as $course){
            $this->data['enrolled_courses'][] = $this->course_model->course_data((object)$course);
        }
        $this->data['page_title'] = 'Course Detail';
        $this->data['page_name'] = 'Course/enrolled_courses';
        return view('App/index', $this->data);
    }
    
    /*** Switch Course ***/
    public function switch_course($course_id){
        if($course_id){
            $this->users_model->edit(['course_id' => $course_id], ['id' => get_user_id()]);
            session()->setFlashdata('message_success', "Course Updated Successfully!");
            return redirect()->to(base_url('app/course/my_course'));
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            return redirect()->to(base_url('app/course/enrolled_courses'));
        }
    }
    
}
