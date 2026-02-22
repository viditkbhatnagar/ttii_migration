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
use App\Models\Assignment_model;
use App\Models\Lesson_model;
use App\Models\Cohort_students_model;

class My_task extends Api
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
        $this->assignment_model = new Assignment_model();
        $this->lesson_model = new Lesson_model();
        $this->cohort_students_model = new Cohort_students_model();

    }
    
    public function index()
    {
        $this->is_valid_request(['GET']);

        $date = $this->request->getGet('date');
        $user_id    = $this->user_id;

        $cohort = $this->cohort_students_model->get_join([
                                                        ['cohorts','cohorts.id = cohort_students.cohort_id'],
                                                    ],
                                                    ['user_id' => $user_id],
                                                    [   'cohort_students.cohort_id as cohort_id',
                                                        'cohorts.title as cohort_title',
                                                        'cohorts.cohort_id as cohort_code',
                                                        'cohorts.course_id as course_id',
                                                        'cohorts.instructor_id as cohort_instructor',
                                                        'cohorts.start_date as cohort_start_date',
                                                        'cohorts.end_date as cohort_end_date',
                                                    ])->getRowArray();
                                                
        $live_classes = [];
        $assignments = [];

        $scheduled_live_classes = [];
        $overdue_live_classes = [];

        $scheduled_assignments = [];
        $overdue_assignments = [];

        if(!empty($cohort)){

            // live class
            $live_classes = $this->live_class_model->get(['cohort_id' => $cohort['cohort_id'],'date' => $date],
                                                        ['id','session_id','title','fromTime','toTime','date','repeat_dates','zoom_id','password','video_url']
                                                        )->getResultArray();

            foreach($live_classes as &$live){
                $live['instructor_id'] = $cohort['cohort_instructor'];
                $live['fromDate'] = $live['date'];
                $live['toDate'] = $live['date'];
                $live['course_id'] = $cohort['course_id'];
                $live = $this->live_class_model->live_class_data($live,$this->user_id, $cohort['course_id']);
                $live['type'] = 'Live';
    
                $liveDate = date('Y-m-d', strtotime($live['date']));
                if ($liveDate === $date) {
                    $scheduled_live_classes[] = $live;
                } elseif ($liveDate < $date) {
                    $overdue_live_classes[] = $live;
                }
            } 
            // assignments/activities
            $assignments = $this->assignment_model->get(['cohort_id' => $cohort['cohort_id'],'due_date' => $date],
                                                        ['id','title','description','added_date','due_date','from_time','to_time','instructions']
                                                        )->getResultArray();
            
            foreach($assignments as &$assignment){
                $assignment['type'] = 'Assignment';

                $dueDate = date('Y-m-d', strtotime($assignment['due_date']));
                if ($dueDate === $date) {
                    $scheduled_assignments[] = $assignment;
                } elseif ($dueDate < $date) {
                    $overdue_assignments[] = $assignment;
                }
            }   
        }

        $scheduled = [
            'live_classes' => $scheduled_live_classes,
            'assignments' => $scheduled_assignments,
        ];

        $overdue = [
            'live_classes' => $overdue_live_classes,
            'assignments' => $overdue_assignments,
        ];
        
        $data = [
            'cohort'        => $cohort ?? [],
            'scheduled'     => $scheduled,
            'overdue'       => $overdue
        ];

        $this->response_data = ['status' => 1,'message' => 'success'  , 'data' => $data];
        return $this->set_response();
    }

}