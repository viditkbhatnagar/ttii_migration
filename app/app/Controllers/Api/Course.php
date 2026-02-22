<?php
//File: app/Controllers/Api/Home.php

namespace App\Controllers\Api;

use App\Controllers\Api\Api;
use App\Models\Category_model;
use App\Models\Course_model;
use App\Models\Enrol_model;
use App\Models\Subject_model;
use App\Models\Users_model;
use App\Models\Review_model;
use App\Models\Exam_model;
use App\Models\Lesson_file_model;
use App\Models\Payment_model;
use App\Models\Package_model;
use App\Models\Review_like_model;
use App\Models\Stories_model;
use App\Models\Live_class_model;
use App\Models\Instructor_enrol_model;
use App\Models\Lesson_model;
use App\Models\Demo_video_model;
use App\Models\Cohort_students_model;

class Course extends Api
{
    private $users_model;
    public function __construct(){
        $this->category_model = new Category_model();
        $this->course_model = new Course_model();
        $this->enrol_model = new Enrol_model();
        $this->subject_model = new Subject_model();
        $this->users_model = new Users_model();
        $this->review_model = new Review_model();
        $this->exam_model = new Exam_model();
        $this->lesson_file_model = new Lesson_file_model();
        $this->payment_model = new Payment_model();
        $this->package_model = new Package_model();
        $this->review_like_model = new Review_like_model();
        $this->stories_model = new Stories_model();
        $this->live_class_model = new Live_class_model();
        $this->instructor_enrol_model = new Instructor_enrol_model();
        $this->lesson_model = new Lesson_model();
        $this->demo_video_model = new Demo_video_model();
        $this->cohort_students_model = new Cohort_students_model();

    }
    
    /*** Courses ***/
    public function all_course(){
        $this->is_valid_request(['GET']);


        $courses = $this->course_model->get()->getResultArray();
        $course_data = [];
        foreach($courses as $course){
            // $course_data[] = $this->course_model->course_data((object)$course);
            $course_data[] = $this->course_model->course_data($course,null,$this->user_id);
        }
        

        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $course_data];
        return $this->set_response();
    }

    /*** Course Overview ***/
    public function get_course_details()
    {
        $this->is_valid_request(['GET']);
        $course_id = $this->request->getGet('course_id');
        $course = $this->course_model->get(['id' => $course_id])->getRow();

        if(!empty($course))
        {
            $enrolled =  $this->enrol_model->get(['course_id' => $course_id, 'user_id' => $this->user_id])->getNumRows()>0 ? 1 : 0;
            $purchase_status = $this->payment_model->user_purchase_status($this->user_id, $course_id);
            
            $demo_videos = $this->demo_video_model->get(['course_id' => $course_id], ['id','title','video_type','video_url','thumbnail'], ['order' => 'asc'])->getResultArray();
            
            if(!empty($demo_videos))
            {
                foreach ($demo_videos as $key => $demo) 
                {
                    $demo_videos[$key]['thumbnail'] = valid_file($demo['thumbnail'] ?? '') ? base_url(get_file($demo['thumbnail'] ?? '')) : '';
                }
            }
            
            $subjects = $this->subject_model->get(['course_id' => $course_id], ['id','title','thumbnail'], ['order' => 'asc'])->getResultArray();
            
            if(!empty($subjects))
            {
                foreach ($subjects as $key => $sub) 
                {
                    $subjects[$key]['thumbnail'] = valid_file($sub['thumbnail'] ?? '') ? base_url(get_file($sub['thumbnail'] ?? '')) : '';
                }
            }


            $reviews = $this->review_model->get_join([['course','course.id = review.course_id','left'],
                        ['users','users.id = review.user_id','left']], 
                        ['review.course_id'=> $course_id],
                        ['review.id','review.rating','review.user_id','review.course_id','review.review','review.created_at as date','course.title as course','users.name as user', 'users.image']
                        )->getResultArray();
            
            foreach($reviews as $key=> $review){
                $reviews[$key]['date'] = $review['date']!=NULL ? date('d M Y', strtotime($review['date'])) : '';
                $reviews[$key]['like_count'] =$this->review_like_model->get(['review_id' => $review['id']])->getNumRows();
                $reviews[$key]['is_liked'] = $this->review_like_model->get(['review_id' => $review['id'], 'user_id' => $this->user_id])->getNumRows()>0 ? 1 : 0;
                $reviews[$key]['image'] = valid_file($review['image']) ? base_url(get_file($review['image'])) : base_url('uploads/dummy_user.jpg');
            }
            
           
            $instructors = $this->users_model->get_join([['instructor_enrol','instructor_id = users.id']], ['instructor_enrol.course_id'=>$course_id],['users.id as instructor_id','name','image'])->getRowArray();
            $instructor_data = [];
            if(!empty($instructors))
            {
                $instructor_data = [
                                'id'  => $instructors['instructor_id'],
                                'name'=> $instructors['name'],
                                'image'=> valid_file($instructors['image']) ? base_url(get_file($instructors['image'])) : base_url('uploads/dummy_user.jpg')
                            ];
                
            }
            
         
            
            $data = [
                'user_data' =>$this->user_data,
                'course'   => $this->course_model->course_data((array)$course),
                'subjects' => $subjects,
                'average_rating' => $this->review_model->average_rating_by_course($course_id),
                'total_reviews' => $this->review_model->get(['course_id' => $course_id])->getNumRows(),
                'rating_data' => $this->review_model->rating_distribution_by_course($course_id),
                'review'   => $reviews,
                'instructor' => $instructor_data,
                'demo_videos' =>$demo_videos,
                'call_us' =>'+91'.get_settings('contact_phone'),
                'whatsapp' =>'+91'.get_settings('contact_whatsapp'),
                'is_enrolled' =>$enrolled,
                'is_purchased' => $purchase_status == 'on' ? 1 : 0,
                'razorpay_api_key' => get_settings('razorpay_api_key')
                                                           
            ];    
        }
        else
        {
            $data = []; 
        }
        
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $data];
        return $this->set_response();
    }
    
    
    
    /*** Enrol to Course ***/
    public function enrol_course()
    {
        $this->is_valid_request(['GET']);
        $user_id = $this->user_id;
        $course_id = $this->request->getGet('course_id');
        $enrol = $this->enrol_model->enrol_course($user_id,$course_id);

        if($enrol > 0){
            $this->response_data = ['status' => 1,'message' => 'success'];
        }else{
            $this->response_data = ['status' => 0, 'message' => 'Already enrolled to the course!'];
        }
        return $this->set_response();
    }
    
    
    
    /* Primary Course Details **/
    public function my_course()
    {
        $this->is_valid_request(['GET']);
        // log_message('error', print_r('Request method validated', true));
    
        $userdata = $this->users_model->get(['id' => $this->user_id])->getRow();
        // log_message('error', print_r($userdata, true));
    
        $enrolled_courses =  $this->enrol_model->get(['user_id' => $userdata->id])->getResultArray();
        // log_message('error', print_r($enrolled_courses, true));
    
        if(!empty($userdata))
        {
            $ongoing_course = [];
            $completed_course = [];
    
            foreach ($enrolled_courses as $course) {
                $course_detail = $this->course_model->get(['id' => $course['course_id']])->getRowArray();
                if (!$course_detail) {
                    continue;
                }
            
                $course_info = $this->course_model->course_data($course_detail);
        
                // Add total subjects
                $course_info['total_subjects'] = $this->subject_model->get(['course_id' => $course['course_id']])->getNumRows();
            
                // Add total lessons
                $course_info['total_lessons'] = $this->lesson_model->get(['course_id' => $course['course_id']])->getNumRows();
            
                // Add total progress 
                $user_progress = $this->course_model->get_user_progress($this->user_id,$course['course_id']);
                $course_info['total_progress'] = round($user_progress['progress']);
            
                // Based on status, decide if ongoing or completed
                    // $completed_course[] = '';
                    $ongoing_course[] = $course_info;
            }
    
            $course_data['ongoing_course'] = $ongoing_course;
            $course_data['completed_course'] = $completed_course;
            // log_message('error', print_r($course_data, true));
    
            $data = [
                'userdata' => $this->users_model->userdata($userdata),
                'course'   => $course_data ?? [],
                // 'completed_count' => $completed_count ?? 0
            ];
            // log_message('error', print_r($data, true));
    
            $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $data];
        }
        else
        {
            $this->response_data = ['status' => 0,'message' => 'user not found' , 'data' => ''];
        }
    
        return $this->set_response();
    }

    
    public function get_subjects()
    {
        $this->is_valid_request(['GET']);
        $course_id = $this->request->getGet('course_id');
        
        $subjects = $this->subject_model->get(['course_id' => $course_id],['id','master_subject_id','title', 'description' , 'thumbnail'])->getResultArray(); //aurora
        //log_message('error', 'Processing subjects: ' .print_r($subjects,true));
        if(!empty($subjects))
        {
            
            foreach($subjects as $key => $subject){

                if(empty($subject['master_subject_id']))
                {
                    $subjects[$key]['master_subject_id'] = $subject['id'];
                }
                 

                //og
                // $is_locked = $this->cohort_students_model->is_locked($this->user_id, $subject);
                //log_message('error', 'Processing subject: ' .print_r($subject,true));



                 // Now is_locked() returns cohort_id (int) if unlocked, or null if locked
                $cohort_id = $this->cohort_students_model->is_locked($this->user_id, $subject);

                

                // Pass cohort_id if unlocked, else null
                $subjects[$key]['cohort_id'] = $cohort_id ?: null;




                $subjects[$key]['thumbnail'] = valid_file($subject['thumbnail'] ?? '') ? base_url(get_file($subject['thumbnail'] ?? '')) : '';
                $subjects[$key]['total_lessons'] = $this->lesson_model->get([ 'subject_id' => $subjects[$key]['master_subject_id']])->getNumRows(); //aurora - added master_subject_id
                $subject_progress = $this->course_model->get_user_progress($this->user_id,$course_id, $subject['master_subject_id']);
                $subjects[$key]['progress'] = isset($subject_progress['progress']) ? (int) round($subject_progress['progress']) : 0;
                // $subjects[$key]['is_locked'] = $is_locked;

                // Boolean locked state
                $subjects[$key]['is_locked'] = empty($cohort_id);
            }

            $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $subjects];
        }else{
            $this->response_data = ['status' => 0,'message' => 'user not found' , 'data' => []];
        }
        
        return $this->set_response();
    }

     
    // public function get_lessons()
    // {
    //     $this->is_valid_request(['GET']);
    //     $subject_id = $this->request->getGet('subject_id');
    //     $lessons = $this->lesson_model->get(['subject_id' => $subject_id], ['id', 'title', 'summary'])->getResultArray();
    
    //     if (!empty($lessons)) {
    //         foreach ($lessons as &$lesson) {
    //             $files = [];
    //             $lesson_files = $this->lesson_file_model->get(['lesson_id' => $lesson['id']], [], ['order' => 'asc'])->getResultArray();
                
    //             $previous_completed = true; // First file should be unlocked
                
    //             foreach ($lesson_files as &$file_data) {
    //                 $file = $this->lesson_file_model->lesson_file_data($file_data, $lesson['id'], $this->user_id);
                    
    //                 // Get progress for the current file
    //                 $progress = $this->lesson_file_model->get_file_progress(
    //                     $file_data['id'], 
    //                     $file_data['lesson_type'] == 'video' ? $file_data['lesson_provider'].'_video' : $file_data['attachment_type'],
    //                     $this->user_id
    //                 );
                    
    //                 // Determine if file should be locked
    //                 $file['lock'] = $previous_completed ? 0 : 1;
                    
    //                 // Update previous_completed flag for next iteration
    //                 $previous_completed = ($progress == 100);
                    
    //                 $files[] = $file;
    //             }

    //             $lesson['lesson_files_count'] = count($files) ?? 0;
    //             $lesson['lesson_files'] = $files;
    //         }
            
    //         $this->response_data = ['status' => 1, 'message' => 'success', 'data' => $lessons];
    //     } else {
    //         $this->response_data = ['status' => 0, 'message' => 'user not found', 'data' => ''];
    //     }
        
    //     return $this->set_response();
    // }

    public function get_lessons()
    {
        $this->is_valid_request(['GET']);
        $subject_id = $this->request->getGet('subject_id');

        // $subject_data = $this->subject_model->get(['id' => $subject_id])->getRowArray(); //aurora
        // $course_id = $subject_data['course_id']; //aurora
        // $lessons = $this->lesson_model->get(['subject_id' => $subject_data['master_subject_id']])->getResultArray();
        // // $lessons = $this->lesson_model->get(['subject_id' => $subject_id])->getResultArray();
        
        $subject_data = $this->subject_model->get(['id' => $subject_id])->getRowArray();
        $course_id = $subject_data['course_id'];
        
        // Fix: Use master_subject_id if available, otherwise use subject_id
        $lesson_subject_id = $subject_data['master_subject_id'] ?: $subject_id;
        $lessons = $this->lesson_model->get(['subject_id' => $lesson_subject_id])->getResultArray();
        
        $lessons_data = [];
    
        if (!empty($lessons)) {
            // Get all lesson IDs for this subject
            $lesson_ids = array_column($lessons, 'id');
            
            // Preload purchase status for all lessons to optimize queries
            $purchase_statuses = [];
            $course_ids = array_unique(array_column($lessons, 'course_id'));
            foreach ($course_ids as $course_id) {
                $purchase_statuses[$course_id] = $this->payment_model->user_purchase_status($this->user_id, $course_id);
            }

            // Process each lesson
            foreach ($lessons as $key => $lesson) {
                $purchase_status = $purchase_statuses[$lesson['course_id']] ?? null;
                $lessons_data[] = $this->lesson_model->lesson_data($lesson, $this->user_id, $purchase_status, $key,$course_id); //aurora
            }

            // Now implement sequential unlocking logic for lesson files across all lessons
            $previous_lesson_completed = true; // First lesson's first file should be unlocked
            
            foreach ($lessons_data as &$lesson) {
                // If the entire lesson is marked as completed, all its files should be unlocked
                if ($lesson['is_completed']) {
                    $previous_lesson_completed = true;
                    continue;
                }

                // Check if previous lesson was completed (for cross-lesson locking)
                $lesson['lock'] = $previous_lesson_completed ? 0 : 1;
                $lesson['lock_message'] = $previous_lesson_completed ? "" : "Please complete the previous lesson";
                
                // If lesson is locked, lock all its files
                if ($lesson['lock'] == 1) {
                    foreach ($lesson['lesson_files'] as &$file) {
                        $file['lock'] = 1;
                    }
                    $previous_lesson_completed = false;
                    continue;
                }

                // Implement sequential file locking within the lesson
                $previous_file_completed = true; // First file in unlocked lesson is always unlocked
                
                foreach ($lesson['lesson_files'] as &$file) {
                    $file['lock'] = $previous_file_completed ? 0 : 1;
                    $previous_file_completed = ($file['progress'] == 100);
                }

                // Update the cross-lesson completion flag
                $previous_lesson_completed = ($lesson['completed_percentage'] == 100);
            }
        }
        //log_message('error', print_r($lessons_data, true));
        
        $this->response_data = [
            'status' => 1,
            'message' => 'success',
            'data' => $lessons_data
        ];
        
        return $this->set_response();
    }
    
       /*** My Learning ***/
    public function my_learning()
    {
        $this->is_valid_request(['GET']);
        
        $user_id = $this->user_id;
        
        $wishlist_details = [];

    
        // Get user data
        $userdata = $this->users_model->get(['id' => $this->user_id])->getRow();
    
        // Fetch enrolled courses with join to get course details
        $enrolled_courses = $this->enrol_model->get_join(
            [
                ['course', 'course.id = enrol.course_id'],
            ],
            ['enrol.user_id' => $this->user_id],
            ['course.id', 'course.title', 'course.thumbnail', 'course.instructor_id']
        )->getResultArray();
    
        // Initialize an empty array for course details
        $course_details = [];
        
    
        // Process each enrolled course
        foreach ($enrolled_courses as $key => $val) 
        {
            // Fetch and set the course thumbnail
            $enrolled_courses[$key]['thumbnail'] = valid_file($val['thumbnail'] ?? '') ? base_url(get_file($val['thumbnail'] ?? '')) : '';
    
            $subjects = $this->subject_model->get(['course_id' => $val['id']])->getResultArray();

            $lessons = $this->lesson_model->get(['course_id' => $val['id']])->getResultArray();
            
            $total_lessons = count($lessons);
            $completed_lessons = 0;
            
            foreach ($lessons as $lesson) {
                $lesson_data = $this->lesson_model->lesson_data($lesson, $user_id);
                
                if ($lesson_data['completed_percentage'] === 100) {
                    $completed_lessons++;
                }
            }
    
            $formatted_percentage = $total_lessons > 0 ? ($completed_lessons / $total_lessons) * 100 : 0;
            

            // Fetch purchase status
            $is_purchased = $this->payment_model->user_purchase_status($this->user_id, $val['id']);
    
            // Add course details to the array
            $course_details[] = [
                'course_id' => $val['id'],
                'title' => $val['title'],
                'thumbnail' => $enrolled_courses[$key]['thumbnail'],
                'lesson_count' => $total_lessons,
                'subject_count' => count($subjects),
                'completed_count' => $completed_lessons,
                'formatted_percentage' => $formatted_percentage,
                'is_purchased' => $is_purchased
            ];
        }
    
        // Prepare the response data
        $data = [
            'userdata' => $this->users_model->userdata($userdata),
            'course' => $course_details,

        ];
    
        $this->response_data = ['status' => 1, 'message' => 'successfully', 'data' => $data];
        return $this->set_response();
    }
    
     /*** Primary Course Details ***/
    public function my_course_details()
    {
        $this->is_valid_request(['GET']);
        $userdata =$this->users_model->get(['id' => $this->user_id])->getRow();
        $course_id =  $this->request->getGet('course_id');
        $primary_course = $this->course_model->get(['id' => $course_id])->getRow();
        $is_purchased = $this->payment_model->user_purchase_status($this->user_id, $course_id);

        $lesson_count =0;
        $total_lessons = 0;
        $completed_lessons= 0;
        $completed_count = 0;
        $formatted_percentage = 0;
        if(!empty($primary_course))
        {
            $course_data = $this->course_model->course_data($primary_course);
            $course_id   = $course_data['id'];
            $subjects = $this->subject_model->get(['course_id' => $course_id],['id','title','free','course_id'],['id' => 'order'])->getResultArray();
            
            if(!empty($subjects))
            {
                $less_count = 0;
                foreach($subjects as $k => $v)
                {
                    $less_count = $this->lesson_model->get(['subject_id' => $v['id']])->getNumRows();
                    $subjects[$k]['lesson_count'] = $less_count;
                }
            }
            
            
            $lessons = $this->lesson_model->get(['course_id' => $course_id],['id','title','free','thumbnail','course_id'],['id' => 'order'])->getResultArray();
            
            $all_lesson_files = [];

            foreach ($lessons as $key => $lesson) {
                $lesson_id = $lesson['id'];
            
                if ($key == 0) {
                    $lessons[$key]['free'] = 'on';
                } 
                elseif ($lesson['free'] === 'off') {
                    $lessons[$key]['free'] = $is_purchased;
                } elseif ($lesson['free'] === 'on') {
                    $lessons[$key]['free'] = 'on';
                } else {
                    $lessons[$key]['free'] = $is_purchased;
                }
            }

            
            $total_lessons = count($lessons);

            foreach ($lessons as $lesson) {
                $lesson_data = $this->lesson_model->lesson_data($lesson, $this->user_id);
                
                if ($lesson_data['completed_percentage'] === 100) {
                    $completed_lessons++;
                }
            }
    
            $formatted_percentage = $total_lessons > 0 ? ($completed_lessons / $total_lessons) * 100 : 0;
            

           
            $this->is_valid_request(['GET']);
            $userdata =$this->users_model->get(['id' => $this->user_id])->getRow();
            $live_classes = $this->live_class_model->get_current_live_classes($this->user_id,$userdata->course_id);
        }
        else
        {
            $subjects = [];
            $course_data = [];
            $live_classes = [];
        }
        
        $data = [
            'userdata' => $this->users_model->userdata($userdata),
            'course'   => $course_data ?? [],
            'subjects'=> $subjects ?? [],
            'live_class'   => $live_classes ?? [],
            'lesson_count' => $total_lessons,
            'completed_lessons' => $completed_lessons,
            'completed_percentage' => $formatted_percentage,
            'practice_link' => base_url('exam/practice_web_view/'.$this->user_id.'/'.$course_id),
            'phone' => get_settings('contact_whatsapp'),

        ];
        $this->response_data = ['status' => 1,'message' => 'succesfully' , 'data' => $data];
        return $this->set_response();
    }
    
    
  
    
    /*** User Enrolled Courses ***/
    public function enrolled_courses() {
        $this->is_valid_request(['GET']); 
        $userdata = $this->users_model->get(['id' => $this->user_id])->getRow();
        $enrolments = $this->enrol_model->get(['user_id' => $this->user_id])->getResultArray();
        
        
        if(!empty($enrolments))
        {
            $course_ids = array_column($enrolments, 'course_id');
  
  
            $courses = $this->course_model->get(['id' => $course_ids])->getResultArray();
            $course_data = [];
            
            foreach ($courses as $course) {
                $course_data[] = $this->course_model->course_data((object)$course, $userdata->course_id); // Pass user course ID
            }
        }
        else
        {
            $course_data = [];
        }
        
        
        
        $this->response_data = ['status' => 1, 'message' => 'success', 'data' => $course_data];
        return $this->set_response();
    }

    
    /*** Switch Course ***/
    public function switch_course(){
        $this->is_valid_request(['GET']);
        $course_id = $this->request->getGet('course_id');
        $this->users_model->edit(['course_id' => $course_id], ['id' => $this->user_id]);
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => []];
        return $this->set_response();
    }
    
    /*** Overall Performance ***/
    public function overall_performance(){
        $this->is_valid_request(['GET']);
        $course_id = $this->request->getGet('course_id');
        if(!empty($course_id))
        {
            $performance_data = $this->course_model->get_performance_data($this->user_id, $course_id);
        }
        else
        {
            $performance_data = new \stdClass();
        }
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $performance_data];
        return $this->set_response();
    }
    
    
    /*** Rating ***/
    public function add_feedback(){
        $this->is_valid_request(['GET']);
        $userdata = $this->users_model->get(['id' => $this->user_id])->getRow();
        // $course_id  = $this->request->getGet('course_id');
        $course_id  = $userdata->course_id;
        $rating     = $this->request->getGet('rating');
        $review     = $this->request->getGet('review');
        
        $exist = $this->review_model->get(['user_id' => $this->user_id, 'course_id' =>$course_id])->getNumRows();
        if($exist==0)
        {
           $insert_data = [
                    'rating'    => $rating,
                    'user_id'   => $this->user_id,
                    'course_id' => $course_id,
                    // 'date_added'=> date('Y-m-d'),
                    'review'    => $review,
                    'created_by'=> $this->user_id,
                    'created_at' => date('Y-m-d H:i:s'),
                ];
        
            $rating_id = $this->review_model->add($insert_data);
            $this->response_data = ['status' => 1,'message' => 'succesfully' , 'data' => []];
        }
        else
        {
            $this->response_data = ['status' => 0,'message' => 'Already Exist' , 'data' => []];
        }
        
        return $this->set_response();
    }
    
    public function analytics()
    {
        $this->is_valid_request(['GET']);
    
        $userdata = $this->users_model->userdata($this->users_model->get(['id' => $this->user_id])->getRow());
    
        // Fetch enrolled courses with join to get course details
        $enrolled_courses = $this->enrol_model->get_join(
            [
                ['course', 'course.id = enrol.course_id'],
            ],
            ['enrol.user_id' => $this->user_id],
            ['course.id','course.title', 'course.thumbnail']
        )->getResultArray();
    
        $course_details = [];
        
        $active_courses = [];
        $completed_courses = [];
       
    
        foreach ($enrolled_courses as $key => $val) 
        {
            $enrolled_courses[$key]['thumbnail'] = valid_file($val['thumbnail'] ?? '') ? base_url(get_file($val['thumbnail'] ?? '')) : '';
            $performance = $this->course_model->get_performance_data($this->user_id, $val['id']);
           
            
           
            $course_details[] = [
                'course_id' => $val['id'],
                'title' => $val['title'],
                'thumbnail' => $enrolled_courses[$key]['thumbnail'],
                'performance' =>$performance
            ];
            
        }
    
        $data = [
            'user_data' => $userdata,
            'courses' => $course_details,
            'empty_text' => 'No courses available'
        ];
    
        $this->response_data = ['status' => 1, 'message' => 'successfully', 'data' => $data];
        return $this->set_response();
    }
    
    
    public function active_course()
    {
        $this->is_valid_request(['GET']);
    
        $userdata = $this->users_model->userdata($this->users_model->get(['id' => $this->user_id])->getRow());
    
        // Fetch enrolled courses with join to get course details
        $enrolled_courses = $this->enrol_model->get_join(
            [
                ['course', 'course.id = enrol.course_id'],
            ],
            ['enrol.user_id' => $this->user_id],
            ['course.id','course.title', 'course.thumbnail']
        )->getResultArray();
    
        $course_details = [];
        
        $active_courses = [];
        $completed_courses = [];
       
    
        foreach ($enrolled_courses as $key => $val) 
        {
            $enrolled_courses[$key]['thumbnail'] = valid_file($val['thumbnail'] ?? '') ? base_url(get_file($val['thumbnail'] ?? '')) : '';
            $performance = $this->course_model->get_performance_data($this->user_id, $val['id']);
           
            
           
            $course_details[] = [
                'course_id' => $val['id'],
                'title' => $val['title'],
                'thumbnail' => $enrolled_courses[$key]['thumbnail'],
                'performance' =>$performance
            ];
            
            if ($performance['overall_performance'] === 100) {
                $completed_courses = $course_details;
            } else {
                $active_courses = $course_details;
            }
        }
    
        $data = [
            'user_data' => $userdata,
            'courses' => $active_courses
        ];
    
        $this->response_data = ['status' => 1, 'message' => 'successfully', 'data' => $data];
        return $this->set_response();
    }
    
    public function completed_course()
    {
        $this->is_valid_request(['GET']);
    
        $userdata = $this->users_model->userdata($this->users_model->get(['id' => $this->user_id])->getRow());
    
        // Fetch enrolled courses with join to get course details
        $enrolled_courses = $this->enrol_model->get_join(
            [
                ['course', 'course.id = enrol.course_id'],
            ],
            ['enrol.user_id' => $this->user_id],
            ['course.id','course.title', 'course.thumbnail']
        )->getResultArray();
    
        $course_details = [];
        
        $active_courses = [];
        $completed_courses = [];
        
        // echo "<pre>";
        // print_r($enrolled_courses); exit();
       
    
        foreach ($enrolled_courses as $key => $val) 
        {
            $enrolled_courses[$key]['thumbnail'] = valid_file($val['thumbnail'] ?? '') ? base_url(get_file($val['thumbnail'] ?? '')) : '';
            $performance = $this->course_model->get_performance_data($this->user_id, $val['id']);
           
            
           
            $course_details[] = [
                'course_id' => $val['id'],
                'title' => $val['title'],
                'thumbnail' => $enrolled_courses[$key]['thumbnail'],
                'performance' =>$performance
            ];
            
            if ($performance['overall_performance'] === 100) {
                $completed_courses = $course_details;
            } else {
                $active_courses = $course_details;
            }
            
            
                            $completed_courses = $course_details;

        }
    
        $data = [
            'user_data' => $userdata,
            'courses' => $completed_courses
        ];
    
        $this->response_data = ['status' => 1, 'message' => 'successfully', 'data' => $data];
        return $this->set_response();
    }
    
    

}
