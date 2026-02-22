<?php
//File: app/Controllers/Api/Home.php

namespace App\Controllers\Api;
use App\Controllers\Api\Api;
use App\Models\Category_model;
use App\Models\Banner_model;
use App\Models\Users_model;
use App\Models\Course_model;
use App\Models\Subject_model;
use App\Models\Review_model;
use App\Models\Notification_model;
use App\Models\Notification_read_model;
use App\Models\Events_model;
use App\Models\Video_progress_model;
use App\Models\Cohort_students_model;
use App\Models\Live_class_model;
use App\Models\Lesson_model;
use App\Models\Lesson_file_model;
use App\Models\Exam_model;
use App\Models\Enrol_model;
use App\Models\Short_videos_model;
use App\Models\Assignment_model;
use App\Models\Assignment_submissions_model;
use App\Models\Frontend_setting_model;
use App\Models\Payment_model;
use App\Models\Practice_attempt_model;
use App\Models\Student_fee_model;


class Home extends Api
{
    private $users_model;
    public function __construct(){
        $this->category_model = new Category_model();
        $this->banner_model = new Banner_model();
        $this->users_model = new Users_model();
        $this->course_model = new Course_model();        
        $this->lesson_model = new Lesson_model();
        $this->lesson_file_model = new Lesson_file_model();
        $this->practice_attempt_model = new Practice_attempt_model();

        $this->review_model = new Review_model();
        $this->notification_model = new Notification_model();
        $this->notification_read_model = new Notification_read_model();

        $this->cohort_students_model = new Cohort_students_model();
        $this->live_class_model = new Live_class_model();
        $this->short_videos_model = new Short_videos_model();
        $this->frontend_setting_model = new Frontend_setting_model();
        $this->events_model = new Events_model();
        $this->video_progress_model = new Video_progress_model();
        $this->subject_model = new Subject_model();
        $this->assignment_model = new Assignment_model();
        $this->assignment_submissions_model = new Assignment_submissions_model();
        $this->exam_model = new Exam_model();
        $this->enrol_model = new Enrol_model();
        $this->payment_model = new Payment_model();
        $this->student_fee_model = new Student_fee_model();

    }
    
    
    
    
    public function app_version()
    {
         $data = [
             'ios_force_update' => get_settings('ios_force_update'),
             'android_force_update' => get_settings('android_force_update'),
             'ios_payment_version' => get_settings('ios_payment_version'),
             'android_payment_version' => get_settings('android_payment_version'),
        ];
        
        $this->response_data = $data;
        return $this->set_response();
    }
    
    
    /*** Home Page Data ***/
    public function index()
    {
        $this->is_valid_request(['GET']);
        $userdata = $this->users_model->get(['id' => $this->user_id])->getRow();

        if (!empty($userdata))
        {

            $banners = $this->banner_model->get_banner($this->user_id);
            // $course = $this->course_model->get(['is_featured' => 1],['id','title','thumbnail','price','discounted_price'],['id' => 'desc'])->getResultArray();
            $course = $this->course_model->get(['is_public' => 1], ['id', 'title', 'thumbnail', 'price', 'discounted_price'], ['id' => 'desc'])->getResultArray();
            foreach ($course as &$c) { // same price if empty
                if (empty($c['discounted_price'])) {
                    $c['discounted_price'] = $c['price'];
                }
            }

            foreach($course as $key=> $val){
                $course[$key]['thumbnail'] = valid_file($val['thumbnail'] ?? '') ? base_url(get_file($val['thumbnail'] ?? '')) : '';
                $course[$key]['lessons'] = $this->lesson_model->get(['course_id' => $val['id']])->getNumRows();
            }
            $ongoing_course = [];
            if($userdata->course_id != NULL)
            {
                $mycourse = $this->course_model->get(['id'=>$userdata->course_id],['id','title','thumbnail'])->getRowArray();
                $user_progress = $this->course_model->get_user_progress($this->user_id,$userdata->course_id);
                $mycourse['progress'] = round($user_progress['progress']);
                $mycourse['subjects'] = $this->subject_model->get(['course_id' => $userdata->course_id])->getNumRows();
                $mycourse['thumbnail'] = valid_file($mycourse['thumbnail'] ?? '') ? base_url(get_file($mycourse['thumbnail'] ?? '')) : '';
                $ongoing_course[] = $mycourse;
            }
             
            $cohorts = $this->cohort_students_model->get_join([
                                                        ['cohorts','cohorts.id = cohort_students.cohort_id'],
                                                    ],
                                                    ['user_id' => $this->user_id],
                                                    [   'cohort_students.cohort_id as cohort_id',
                                                        'cohorts.title as cohort_title',
                                                        'cohorts.cohort_id as cohort_code',
                                                        'cohorts.instructor_id as cohort_instructor',
                                                        'cohorts.start_date as cohort_start_date',
                                                        'cohorts.end_date as cohort_end_date',
                                                    ])->getResultArray();

            $cohort_ids = null;                                        
            $today = date('Y-m-d');
            
            if(!empty($cohorts)){
                log_message('error', 'cohorts: ' . print_r($cohorts, true));
                //$live_class = $this->live_class_model->get(['date' => $today])->getResultArray();
                //log_message('error', 'live_class: ' . print_r($live_class, true));
                
                // Get cohort IDs for the user
                $cohort_ids = array_column($cohorts, 'cohort_id');
                
                // Get live classes for all user cohorts
                $live_classes = $this->live_class_model->get(   
                                                                ['cohort_id' => $cohort_ids,'date' => $today],
                                                                ['id','session_id','title','date','fromTime','toTime','zoom_id','password','cohort_id','video_url','instructor_id']
                                                            )->getResultArray();

                foreach($live_classes as &$live){
                    // Find the cohort for this live class to get the instructor
                    $live_cohort = null;
                    foreach($cohorts as $cohort) {
                        if($cohort['cohort_id'] == $live['cohort_id']) {
                            $live_cohort = $cohort;
                            break;
                        }
                    }
                    $live['instructor_id'] = $live_cohort ? $live_cohort['cohort_instructor'] : '';
                    $live['fromDate'] = $live['date'];
                    $live['toDate'] = $live['date'];
                    $live['course_id'] = $userdata->course_id;
                    $live = $this->live_class_model->live_class_data($live,$this->user_id, $userdata->course_id);
                    $live['type'] = 'Live';
                }

                // Get upcoming live classes for all user cohorts
                $upcoming_live_classes = $this->live_class_model->get_live_classes($this->user_id,null,null,$cohort_ids);
        
                $upcoming_live = [];
                
                foreach ($upcoming_live_classes as $upcoming_live_class) {
                    if (strpos($upcoming_live_class['status'], 'Next Live') !== false) {
                        $upcoming_live[] = $upcoming_live_class;
                    }
                    
                }


                $assignments = $this->assignment_model->get(['cohort_id' => $cohort_ids,'due_date' => $today],
                                                        ['id','title','description','added_date','due_date','from_time','to_time','instructions']
                                                        )->getResultArray();

                foreach($assignments as &$assignment){
                    $assignment['type'] = 'Assignment';
                }  
                
            }else{
                $live_classes = [];
                $upcoming_live = []; 
                $assignments = [];
            }
            
            $today_tasks = array_merge($live_classes,$assignments);

            // Events
            $events =  $this->events_model->event_with_date($today,$this->user_id);
            // Exams
            $exams = $this->exam_model->get(['course_id' => $userdata->course_id])->getResultArray();
            
            foreach ($exams as $key => &$exm) {
                $exm = $this->exam_model->exam_data($exm,$this->user_id);
            }
            
            $upcoming_schedules = [
                //'live_class' => $live_classes,
                'live_class' => $upcoming_live,
                'events' => $events,
                'exams' => $exams,
            ];
            
            $progress = $this->video_progress_model->get_join(
                            [
                                ['lesson_files', 'lesson_files.id = video_progress_status.lesson_file_id','left'],
                                ['lesson', 'lesson.id = lesson_files.lesson_id','left'],
                                ['subject', 'subject.id = lesson.subject_id','left'],

                            ],['video_progress_status.user_id'=> $this->user_id],[' subject.title as subject','lesson.title as lesson','lesson_files.title as lesson_file_title'],
                            ['video_progress_status.id' =>'desc']
                        )->getRowArray();

            // Get all courses the user is enrolled in
            
            $courses_enrolled = $this->enrol_model->get_join([
                ['course', 'enrol.course_id = course.id', 'left'],
            ],
            ['enrol.user_id' => $this->user_id, 'course.deleted_at' => null],
            ['enrol.course_id'])->getResultArray();


            $courses_enrolled_ids = array_column($courses_enrolled, 'course_id');

             $total_progress = 0;
             $total_courses = count($courses_enrolled);

             if ($total_courses > 0) {
                foreach ($courses_enrolled as &$c_enrolled) {
                    // Assuming this returns a percentage (e.g., 75)
                    $progress_data = $this->course_model->get_user_progress($this->user_id, $c_enrolled['course_id']);
                    $total_progress += floatval($progress_data['progress']);
                }

                // Calculate average progress
                $course_progress = $total_progress / $total_courses;
                $course_progress = round($course_progress);
            } else {
                $course_progress = 0;
            }

            // $course_count = $this->enrol_model
            //                 ->where('user_id', $this->user_id)
            //                 ->countAllResults();
            $course_count = $total_courses;


            // $course_progress = $this->course_model->get_user_progress($this->user_id,$userdata->course_id);
            // $course_progress = round($course_progress['progress']);
            // log_message('error','$course_progress :'. $course_progress);


            // $assignments_count = $this->assignment_model
            //                     ->where('course_id', $userdata->course_id)
            //                     ->countAllResults();

            // $assignments_submitted = $this->assignment_submissions_model
            //                         ->where('user_id', $this->user_id)
            //                         ->where('course_id', $userdata->course_id)
            //                         ->countAllResults();
            // $assignments_count = $this->assignment_model->get(['cohort_id' => $cohort_ids])->getNumRows();  //changed from course_ids to cohort_ids

            if (!empty($cohort_ids)) {
                $assignments_count = $this->assignment_model
                    ->get(['cohort_id' => $cohort_ids])
                    ->getNumRows();
            } else {
                $assignments_count = 0;
            }

            // log_message('error','$assignments_count :'. $assignments_count);
            // log_message('error','$courses_enrolled :'. json_encode($courses_enrolled));
            // log_message('error','assignments :'. json_encode($this->assignment_model->get(['course_id' => $courses_enrolled_ids])->getResultArray()));

            // $assignments_submitted = $this->assignment_submissions_model->get(['user_id' => $this->user_id,'course_id' => $courses_enrolled_ids])->getNumRows();
            if (!empty($courses_enrolled_ids)) {
                $assignments_submitted = $this->assignment_submissions_model->get([
                    'user_id' => $this->user_id,
                    'course_id' => $courses_enrolled_ids
                ])->getNumRows();
            } else {
                $assignments_submitted = 0;
            }


            $assignments_progress = $assignments_count > 0 
            ? round(($assignments_submitted / $assignments_count) * 100, 0)
            : 0;
            
           // Step 1: Get all lessons for enrolled courses
            $lessons = [];

            if (!empty($courses_enrolled_ids)) {
                $lessons = $this->lesson_model
                    ->get(['course_id' => $courses_enrolled_ids])
                    ->getResultArray();
            }


            $lesson_ids = array_column($lessons, 'id');

            $practice_count = 0;  // quiz count

            if (!empty($lesson_ids)) {
                // Step 2: Get lesson files that are quizzes
                $lesson_files = $this->lesson_file_model->get(['lesson_id' => $lesson_ids, 'attachment_type' => 'quiz'])->getResultArray();
                $practice_count = count($lesson_files);
                $lesson_files_ids = array_column($lesson_files, 'id');
            }
            
            $practice_progress = $this->practice_attempt_model->get(['user_id' => $this->user_id,'lesson_file_id' => $lesson_ids,'submit_status' => 1])->getNumRows();

            $practice_progress = $practice_count > 0 
            ? round(($practice_progress / $practice_count) * 100, 0)
            : 0;

            $total_payments_done = $this->payment_model->get(['user_id'=> $this->user_id,'course_id' => $this->course_id])->getNumRows();

            $learning_progress  = [
                                    'individual_courses' => [
                                        'score' => (string)$course_count,
                                        'progress' => (string)$course_progress 
                                    ],
                                    'total_assignments' => [
                                        'score' => (string)$assignments_count,
                                        'progress' => $assignments_progress
                                    ],
                                    'badge_earned' => [
                                        'score' => '0/0',
                                        'progress' => '0'
                                    ],
                                    'practice' => [
                                        'score' => (string)$practice_count,
                                        'progress' => $practice_progress
                                    ],
                                    'payment' => [
                                        'score' => $total_payments_done,
                                        'progress' => '0'
                                    ],
                                    'exam' => [
                                        'score' => '0/0',
                                        'progress' => '0'
                                    ]
                                ];
    
    
      
            $data = [
                'userdata'      => $this->users_model->userdata($userdata),
                'banner'        => $banners,
                'ongoing_course'=> $ongoing_course,
                'today_tasks'     => $today_tasks,
                'courses'       => $course,
                // 'live_class'    => $live_classes,
                // 'events'        => $events,
                'upcoming_schedules'        => $upcoming_schedules,
                // 'last_watched'  => $progress ?? [],
                // 'call_us'       => get_settings('contact_phone'),
                // 'whatsapp'      => get_settings('contact_whatsapp'),
                // 'notification_count' => $this->notification_model->getUnreadCount($this->user_id, $userdata->course_id),
                'learning_progress'   => $learning_progress,
            ];
            //log_message('error', 'data: ' . print_r($data, true));
            $this->response_data = ['status' => 1, 'message' => 'successfully', 'data' => $data];
        }
        else
        {
            $this->response_data = ['status' => 0, 'message' => 'user not found', 'data' => ''];
        }
    
        return $this->set_response();
    }
    
        
    public function view_all_shorts(){
        $this->is_valid_request(['GET']);
        $userdata = $this->users_model->get(['id' => $this->user_id])->getRow();
        
            $all_videos = $this->short_videos_model->get([], ['id', 'title', 'thumbnail', 'uploaded_video', 'set_as_popular', 'set_as_trending'], ['id' => 'desc'])->getResultArray();

            $trending_videos = [];
            $popular_videos = [];
            
            foreach ($all_videos as $key => $val) {
                // Set the thumbnail and uploaded video URLs if the file is valid
                $all_videos[$key]['thumbnail'] = valid_file($val['thumbnail']) ? base_url(get_file($val['thumbnail'])) : '';
                $all_videos[$key]['uploaded_video'] = valid_file($val['uploaded_video']) ? base_url(get_file($val['uploaded_video'])) : '';
            
                // Check if the video should be in the trending or popular array
                if ($val['set_as_trending'] == 1) {
                    $trending_videos[] = $all_videos[$key];
                }
                if ($val['set_as_popular'] == 1) {
                    $popular_videos[] = $all_videos[$key];
                }
            }
            
            // Prepare the final array
            $short_videos = [
                'latest' => $all_videos,  // This will contain all videos
                'trending' => $trending_videos,  // Only videos marked as trending
                'popular' => $popular_videos   // Only videos marked as popular
            ];

        
        $this->response_data = ['status' => true, 'message' => 'Success' , 'data' => $short_videos];
        return $this->set_response();
    }
    
    
     public function get_notification(){
        $this->is_valid_request(['GET']);
        $userdata = $this->users_model->get(['id' => $this->user_id])->getRow();
        $course_id = $userdata->course_id;

        $notifications = $this->notification_model->get(['course_id' => [$course_id,0]], null, ['id' => 'DESC'])->getResultArray();
        $logger = service('logger');
        $logger->error('Database Error: ' . db_connect()->getLastQuery());
        
        $notification_data = [];
        foreach($notifications as $key => $notification){
            $notification_data[$key]['id'] = $notification['id'];
            $notification_data[$key]['title'] = $notification['title'];
            $notification_data[$key]['description'] = strip_tags($notification['description']);
            // $notification_data[$key]['date'] = $notification['timestamp'];
            // $notification_data[$key]['is_read'] = $this->notification_read_model->get(['user_id' => $this->user_id, 'notification_id' => $notification['id']])->getNumRows() >0 ? 1 : 0;
        }
        
        $this->response_data = ['status' => 1, 'message' => 'Success' , 'data' => $notification_data];
        return $this->set_response();
    }
    
    public function get_notification_list(){
        $this->is_valid_request(['GET']);
        $userdata = $this->users_model->get(['id' => $this->user_id])->getRow();
        $notifications = $this->notification_model->get( )->getResultArray();
        
        $notification_data = [];
        foreach($notifications as $key => $notification){
            $notification_data[$key]['id'] = $notification['id'];
            $notification_data[$key]['title'] = $notification['title'];
            $notification_data[$key]['description'] = strip_tags(htmlspecialchars_decode($notification['description'], ENT_QUOTES));
            // $notification_data[$key]['external_link'] = $notification['external_link'];
            // $notification_data[$key]['date'] = date('d-m-Y H:i A', strtotime($notification['timestamp']));
            // $notification_data[$key]['is_read'] = $this->notification_read_model->get(['user_id' => $this->user_id, 'notification_id' => $notification['id']])->getNumRows() >0 ? 1 : 0;

        }
        
        $this->response_data = ['status' => true, 'message' => 'Success' , 'data' => $notification_data];
        return $this->set_response();
    }
    
    
    public function mark_notification_as_read(){
        $this->is_valid_request(['GET']);
        $user_id = $this->user_id;
        $notification_id = $this->request->getGet('notification_id');
        if($this->notification_read_model->get(['user_id' => $user_id, 'notification_id' => $notification_id])->getNumRows() == 0){
            $data = [
                'notification_id'   => $this->request->getGet('notification_id'),
                'user_id'           => $user_id,
                'status'            => 1,
                'created_by'        => $user_id,
                'created_at'        => date('Y-m-d H:i:s'),
            ];
            $inserted_id = $this->notification_read_model->add($data);
            if ($inserted_id){
                $this->response_data = ['status' => 1, 'message' => 'Success' , 'data' => []];
            }else{
                $this->response_data = ['status' => 0, 'message' => 'Something went wrong' , 'data' => []];
            }
        }
        
        return $this->set_response();
    }

    public function save_notification_token(){
        $this->is_valid_request(['GET']);
        $user_id = $this->user_id;
        $token = $this->request->getGet('notification_token');
        if (!empty($token)) {
            $data = [
                'notification_token' => $token,
                'updated_at' => date('Y-m-d H:i:s'),
                'updated_by' => $user_id,
            ];
            $this->users_model->edit($data, ['id' => $user_id]);
            $this->response_data = ['status' => 1, 'message' => 'Token saved successfully', 'data' => []];
        } else {
            $this->response_data = ['status' => 0, 'message' => 'Token is empty', 'data' => []];
        }
        
        return $this->set_response();
    }



}
