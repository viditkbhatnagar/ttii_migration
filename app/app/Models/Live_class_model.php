<?php namespace App\Models;

use CodeIgniter\Model;
use App\Models\Payment_model;
use App\Models\Users_model;
use App\Models\Course_model;
use App\Models\Cohorts_model;
use App\Models\Enrol_model;
use App\Models\Vimeo_videolinks_model;

class Live_class_model extends Base_model
{
    protected $table         = 'live_class';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Zoom';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
    public function get_live_classes($user_id, $course_id=null,$subject_id=null,$cohort_id=null)
    {
        $this->enrol_model = new Enrol_model();
     
        if(!empty($subject_id))
        {
            $live_classes = $this->get(['course_id' => $course_id,'subject_id'=>$subject_id])->getResultArray();
        }
        elseif(!empty($course_id))
        {
            $live_classes = $this->get(['course_id' => $course_id])->getResultArray();
        }
        elseif(!empty($cohort_id))
        {
            $live_classes = $this->get(['cohort_id' => $cohort_id])->getResultArray();
            
        }
        // else
        // {
        //      $live_classes = $this->get()->getResultArray();
        // }
        
        

        if(!empty($user_id) && empty($course_id)){
            // First get all course_ids for the user
        $course_ids = array_column($this->enrol_model->get(['user_id' => $user_id], ['course_id'])->getResultArray(), 'course_id');
        // log_message('error', 'Fetched course_ids for user '.$user_id.': '.print_r($course_ids, true));

        // Remove null or 0 values
        $course_ids = array_filter($course_ids, function($id) {
            $valid = $id !== null && $id !== 0;
            if (!$valid) {
                // log_message('error', 'Filtered out invalid course_id: '.print_r($id, true));
            }
            return $valid;
        });
        // log_message('error', 'Filtered course_ids: '.print_r($course_ids, true));

        // Initialize an array to store all cohort_ids
        $all_cohort_ids = [];
        // log_message('error', 'Initialized empty all_cohort_ids array');

        // Loop through each course_id and get associated cohorts
        foreach ($course_ids as $course_id) {
            // log_message('error', 'Processing course_id: '.$course_id);
            
            // Get cohort_ids for this course
            $cohort_ids = $this->getCohortIdsByCourseID($course_id);
            // log_message('error', 'Found cohort_ids for course '.$course_id.': '.print_r($cohort_ids, true));
            
            // Merge with the main array (avoiding duplicates)
            $all_cohort_ids = array_merge($all_cohort_ids, $cohort_ids);
            // log_message('error', 'Merged cohort_ids. Current count: '.count($all_cohort_ids));
        }

        // Remove any duplicate cohort_ids (if needed)
        $all_cohort_ids = array_unique($all_cohort_ids);
        // log_message('error', 'After removing duplicates, unique cohort_ids: '.print_r($all_cohort_ids, true));

        if(!empty($all_cohort_ids)){
            // log_message('error', 'Fetching live classes for cohort_ids');
            $live_classes = $this->get(['cohort_id' => $all_cohort_ids],null,['date' => 'desc'])->getResultArray();
            // log_message('error', 'Found '.count($live_classes).' live classes');
        } else {
            // log_message('error', 'No valid cohort_ids found, setting empty live_classes');
            $live_classes = [];
        }
            
        }
        
        
        $live_class_data = [];
        foreach($live_classes as $live_class){
            $live_class_data[] = $this->live_class_data($live_class,$user_id, $course_id);
        }
        return $live_class_data;
    }



    //for past classes api
    public function get_live_classes_by_cohort($user_id, $course_id=null,$subject_id=null,$cohort_id=null)
    {
        $this->enrol_model = new Enrol_model();
     
        if(!empty($subject_id))
        {
            $live_classes = $this->get(['course_id' => $course_id,'subject_id'=>$subject_id])->getResultArray();
        }
        elseif(!empty($course_id))
        {
            $live_classes = $this->get(['course_id' => $course_id])->getResultArray();
        }
        elseif(!empty($cohort_id))
        {
            
            $live_classes = $this->get(['cohort_id' => $cohort_id])->getResultArray();
            
        }
        // else
        // {
        //      $live_classes = $this->get()->getResultArray();
        // }
        
        /*******************************    commented on 28/10/25 */
        
        // if(!empty($user_id) && empty($course_id)){
        //     // First get all course_ids for the user
        // $course_ids = array_column($this->enrol_model->get(['user_id' => $user_id], ['course_id'])->getResultArray(), 'course_id');
        // // log_message('error', 'Fetched course_ids for user '.$user_id.': '.print_r($course_ids, true));

        // // Remove null or 0 values
        // $course_ids = array_filter($course_ids, function($id) {
        //     $valid = $id !== null && $id !== 0;
        //     if (!$valid) {
        //         // log_message('error', 'Filtered out invalid course_id: '.print_r($id, true));
        //     }
        //     return $valid;
        // });
        // // log_message('error', 'Filtered course_ids: '.print_r($course_ids, true));

        // // Initialize an array to store all cohort_ids
        // $all_cohort_ids = [];
        // // log_message('error', 'Initialized empty all_cohort_ids array');

        // // Loop through each course_id and get associated cohorts
        // foreach ($course_ids as $course_id) {
        //     // log_message('error', 'Processing course_id: '.$course_id);
            
        //     // Get cohort_ids for this course
        //     $cohort_ids = $this->getCohortIdsByCourseID($course_id);
        //     // log_message('error', 'Found cohort_ids for course '.$course_id.': '.print_r($cohort_ids, true));
            
        //     // Merge with the main array (avoiding duplicates)
        //     $all_cohort_ids = array_merge($all_cohort_ids, $cohort_ids);
        //     // log_message('error', 'Merged cohort_ids. Current count: '.count($all_cohort_ids));
        // }

        // // Remove any duplicate cohort_ids (if needed)
        // $all_cohort_ids = array_unique($all_cohort_ids);
        // // log_message('error', 'After removing duplicates, unique cohort_ids: '.print_r($all_cohort_ids, true));

        // if(!empty($all_cohort_ids)){
        //     // log_message('error', 'Fetching live classes for cohort_ids');
        //     $live_classes = $this->get(['cohort_id' => $all_cohort_ids],null,['date' => 'desc'])->getResultArray();
        //     // log_message('error', 'Found '.count($live_classes).' live classes');
        // } else {
        //     // log_message('error', 'No valid cohort_ids found, setting empty live_classes');
        //     $live_classes = [];
        // }
            
        // }
        
        /*******************************  end-  commented on 28/10/25 */




        $live_class_data = [];
        foreach($live_classes as $live_class){
            $live_class_data[] = $this->live_class_data($live_class,$user_id, $course_id);
        }
        return $live_class_data;
    }
    
    public function live_class_data($live_class, $user_id, $course_id){

        
        $this->payment_model = new Payment_model();
        $this->users_model = new Users_model();
        $this->course_model = new Course_model();
        
        $purchase_status = $this->payment_model->user_purchase_status($user_id, $course_id);
        
        $instructor = $this->users_model->get(['id' =>$live_class['instructor_id']],['id','name','image'])->getRowArray();
         
        $date_from = strtotime($live_class["date"].$live_class["fromTime"]);
        $date_to = strtotime($live_class["date"].$live_class["toTime"]);
        $currentDate = date("Y-m-d");
        $currentTime = date("H:i:s");
        $date_now  =strtotime($currentDate . $currentTime);
        $time = $date_from-$date_now;
        $time_a = $date_to-$date_now;
        if($time > 0)
            $status="Next Live ".strftime('%d %B', strtotime($live_class['date']))." ".date('h:i A', strtotime($live_class["fromTime"]));
        else if($time_a<0)
            $status="Expired";
        else
            $status="Live Now";

        // Calculate duration
        $duration_seconds = $date_to - $date_from;

        $hours = floor($duration_seconds / 3600);
        $minutes = floor(($duration_seconds % 3600) / 60);

        $duration_text = '';
        if ($hours > 0) {
            $duration_text .= $hours . ' hr ';
        }
        $duration_text .= $minutes . ' min';
 
        $this->vimeo_videolinks_model = new Vimeo_videolinks_model();

        $video_data = $this->vimeo_videolinks_model->get(['live_class_id' => $live_class['id']],['id','quality','rendition','height','width','type','link','fps','size','public_name','size_short','download_link'])->getResultArray();
            
        
           if (!empty($video_data)) 
           {
                // Extract the first item to a separate variable
                $first_item = array_shift($video_data);
                
                // Sort the remaining items by the 'height' key in ascending order
                usort($video_data, function($a, $b) {
                    return $a['height'] <=> $b['height'];
                });
            
                // Add the first item back to the start of the sorted array
                array_unshift($video_data, $first_item);
                
                $download_link = $video_data[1]['download_link'];
            }
         
        $live_classdata = [
            'id' => $live_class['id'] ?? '',
            'title' => $live_class['title'] ?? '',
            // 'course_id' => $live_class['course_id'] ?? '',
            // 'course_name' => $this->course_model->get(['id'=>$live_class['course_id']])->getRow()->title ?? '',
            'date' => date('d-m-Y',strtotime($live_class['date'])) ?? '',
            'time' => date('h:i A', strtotime($live_class["fromTime"])) ." - ". date('h:i A', strtotime($live_class["toTime"])),
            'status' => $status,
            'duration' => $duration_text,
            // 'free' => 'on',
            'show_join' => 1,
            'show_host' => 0,
            'instructor_name' => $instructor['name'] ?? '',
            'instructor_image' => !empty($instructor['image']) ? (valid_file($instructor['image']) ? base_url(get_file($instructor['image'])) : base_url('uploads/dummy.jpg')) : base_url('uploads/dummy.jpg'),
            // 'instructor_image' => base_url('uploads/dummy.jpg'),
            'zoom_key' => get_settings('zoom_api_key'),
            'meeting_id' => $live_class['zoom_id'],
            'meeting_password' => $live_class['password'],
            'zoom_id' => $live_class['zoom_id'],
            'password' => $live_class['password'],
            'free' => $purchase_status,
            'video_files' => $live_class['video_url'] ? $video_data : []
        ];
        return $live_classdata;
    }
    
    public function get_current_live_classes($user_id, $course_id){
        $logger = service('logger');
        $currentDateTime = date('Y-m-d H:i:s');
    
        // $query = $this->db->table('live_class')
        //     ->where('course_id', $course_id)
        //     ->where('deleted_at IS NULL')
        //     ->where('fromDate <=', $currentDateTime)
        //     ->where('toDate >=', $currentDateTime)
        //     ->where('fromTime <=', date('H:i:s'))
        //     ->where('toTime >=', date('H:i:s'))
        //     ->orderBy('id', 'desc')
        //     ->get();
        $query = $this->get(['cohort_id' => $this->getCohortIdsByCourseId($course_id), 'fromDate <=' => $currentDateTime, 'toDate >=' => $currentDateTime, 'fromTime <=' => date('H:i:s'), 'toTime >=' => date('H:i:s')],null,['id' => 'desc']);
    
        $live_classes = $query->getResultArray();
        // $logger->error('liveclass Database Error: ' . db_connect()->getLastQuery());


        $live_class_data = [];
        foreach($live_classes as $live_class){
            $live_class_data[] = $this->live_class_data($live_class,$user_id, $course_id);
        }
        return $live_class_data;
    }

    
    public function upcoming_live_class_data($user_id, $course_id) {
        $this->payment_model = new Payment_model();
        $this->users_model = new Users_model();
        $this->course_model = new Course_model();
        
        $logger = service('logger');
        $query = $this->db->table('live_class')
                ->where('course_id', $course_id)
                ->groupStart()
                    ->where('live_type', 1)
                ->groupEnd()
                ->orGroupStart()
                    ->where('live_type', 2)
                    ->where('student_id', $user_id)
                ->groupEnd()
                ->orderBy('id', 'desc')
                ->get();
        
        $live_classes = $query->getResultArray();
        
        $purchase_status = $this->payment_model->user_purchase_status($user_id, $course_id);
        $student_name = array_column($this->users_model->get()->getResultArray(),'name','id');

        $live_class_data = [];
        foreach($live_classes as $live_class){
            $date_from = strtotime($live_class["fromDate"].$live_class["fromTime"]);
            $date_to = strtotime($live_class["toDate"].$live_class["toTime"]);
            $currentDate = date("Y-m-d");
            $currentTime = date("H:i:s");
            $date_now = strtotime($currentDate . $currentTime);
            $time = $date_from - $date_now;
            if ($time > 0) {
                $status = "Upcoming";
                $live_class_data[] = [
                    'id' => $live_class['id'] ?? '',
                    'title' => $live_class['title'] ?? '',
                    'category_id' => $live_class['category_id'] ?? '',
                    'course_id' => $live_class['course_id'] ?? '',
                    'course_name' => $this->course_model->get()->getRow()->title,
                    'live_type' => $live_class['live_type'] == 1 ? 'Course Live' : 'One to one',
                    'student_name' => isset($student_name[$live_class['student_id']]) ? $student_name[$live_class['student_id']] : '',
                    'student_id' => $live_class['student_id'] ?? '',
                    'date' => $live_class['fromDate'] ?? '',
                    'time' => date('h:i A', strtotime($live_class["fromTime"])) ." - ". date('h:i A', strtotime($live_class["toTime"])),
                    'status' => $status,
                    'free' => $live_class['free'] == 'on' ? 'on' : $purchase_status,
                    'show_join' => 1,
                    'show_host' => 0,
                    'zoom_key' => get_settings('zoom_api_key'),
                    'zoom_id' => $live_class['zoom_id'],
                    'password' => $live_class['password'],
                ];
            }
        }
        return $live_class_data ?? [];
    }
    
    public function active_live_class_data($user_id, $course_id) {
        $this->payment_model = new Payment_model();
        $this->users_model = new Users_model();
        $this->course_model = new Course_model();
        
        // $logger = service('logger');
        // $query = $this->db->table('live_class')
        //         ->where('course_id', $course_id)
        //         ->orderBy('id', 'desc')
        //         ->get();
        $query = $this->get(['cohort_id' => $this->getCohortIdsByCourseId( $course_id)],null,['id' =>  'desc']);
        
        $live_classes = $query->getResultArray();
        
        $live_class_data = [];
        foreach($live_classes as $live_class){
            $live_class_data[] = $this->live_class_data($live_class,$user_id, $course_id);
        }
        return $live_class_data;
    }


    public function getCohortIdsByCourseId($course_id)
    {
        $this->cohorts_model = new Cohorts_model();
        $result =$this->cohorts_model->get(['course_id' => $course_id],['id'])->getResultArray();
        
        // Extract just the cohort_id values into an array
        $cohortIds = array_column($result, 'id');
        
        return $cohortIds;
    }
    
}
