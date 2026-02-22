<?php namespace App\Models;

use CodeIgniter\Model;
use DateTime;
use App\Models\Lesson_model;
use App\Models\Video_progress_model;
use App\Models\Material_progress_model;
use App\Models\Vimeo_videolinks_model;
use App\Models\Quiz_model;
use App\Models\Practice_attempt_model;

class Lesson_file_model extends Base_model
{
    protected $table         = 'lesson_files';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Lesson_file';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
    
      
    public function lesson_file_data($lesson_file,$lesson_id, $user_id=null){
        
        // log_message('error',print_r($lesson_file,true));
        
        $this->vimeo_videolinks_model = new Vimeo_videolinks_model();
        $this->lesson_model = new Lesson_model();
        $this->quiz_model = new Quiz_model();
        $this->practice_attempt_model = new Practice_attempt_model();
        // if($lesson_file['lesson_provider'] == 'youtube' || $lesson_file['lesson_provider'] == 'vimeo'){
        //     $video_url_id = getVideoId($lesson_file['video_url']);
        // }else{
        //     $video_url_id = '';
        // }

        $course_id = $this->lesson_model->get(['id' => $lesson_id])->getRow()->course_id;
        $number_of_questions = $this->quiz_model->get(['lesson_file_id' => $lesson_file['id']])->getNumRows();
        $video_url_id = '';
        
        $video_data =[];
        
        $download_link = '';
        
        if($lesson_file['lesson_provider'] == 'vimeo')
        {
            $video_data = $this->vimeo_videolinks_model->get(['lesson_file_id' => $lesson_file['id']],['id','quality','rendition','height','width','type','link','fps','size','public_name','size_short','download_link'])->getResultArray();
            //log_message('error',print_r($video_data,true));
            
            // If no video data exists, try to fetch it from Vimeo API
            if (empty($video_data)) {
                log_message('info', 'No video data found for lesson_file_id: ' . $lesson_file['id'] . ', attempting to fetch from Vimeo API');
                
                // Use our helper function to fetch and store Vimeo links
                $fetch_result = process_vimeo_links_for_lesson_file($lesson_file['id']);
                
                if ($fetch_result['status']) {
                    log_message('info', 'Successfully fetched Vimeo links: ' . $fetch_result['message']);
                    // Re-fetch the data from database
                    $video_data = $this->vimeo_videolinks_model->get(['lesson_file_id' => $lesson_file['id']],['id','quality','rendition','height','width','type','link','fps','size','public_name','size_short','download_link'])->getResultArray();
                } else {
                    log_message('error', 'Failed to fetch Vimeo links: ' . $fetch_result['message']);
                }
            }
            
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
            
        }
        elseif($lesson_file['video_type'] == 'html5')
        {
            $video_data[] = [
                'link'          => $lesson_file['video_url'] ?? '',
                'download_link' => $lesson_file['video_url'] ?? '',
            ];
        }
       
        if($download_link != '')
        {
            $download_url = $download_link;
        }
        else
        {
            $download_url = $lesson_file['download_url'];
        }
        $lessonType = '';
        if ($lesson_file['lesson_type'] === 'video' && $lesson_file['lesson_provider'] === 'youtube') {
            $lessonType = 'youtube_video';
        } elseif ($lesson_file['lesson_type'] === 'video' && $lesson_file['lesson_provider'] === 'vimeo') {
            $lessonType = 'vimeo_video';
        } elseif ($lesson_file['attachment_type'] === 'audio') {
            $lessonType = 'audio';
        } elseif ($lesson_file['attachment_type'] === 'article') {
            $lessonType = 'article';
        } elseif ($lesson_file['attachment_type'] === 'pdf') {
            $lessonType = 'document';
        } elseif ($lesson_file['attachment_type'] === 'quiz') {
            $lessonType = 'quiz';
        } else {
            $lessonType = ucfirst($lesson_file['lesson_type']);
        }

        $lesson_file_data = [
            'id' => $lesson_file['id'] ?? '',
            'sub_title' => $lesson_file['sub_title'] ?? '',
            'title' => $lesson_file['title'] ?? '',
            'lesson_id' => $lesson_file['lesson_id'] ?? '',
            'parent_file_id' => $lesson_file['parent_file_id'] ?? '',
            'description' => $lesson_file['summary'] ?? '',
            'duration' => $lesson_file['duration'] ?? '',
            'lesson_provider' => $lesson_file['lesson_provider'] ?? '',
            'video_type' => $lesson_file['video_type'] ?? '',
            'video_url' => $lesson_file['video_url'] ?? '',
            'is_downloadable' =>  $lesson_file['download_url']!=NULL ? 1 : 0,
            'download_url' => $lesson_file['download_url'] ?? '',
            'lesson_type' => $lesson_file['lesson_type'] ?? '',
            'attachment_type' => $lesson_file['attachment_type'] ?? '',
            'attachment_url' => valid_file($lesson_file['attachment']) ? base_url(get_file($lesson_file['attachment'])) : '',
            'audio_url' => valid_file($lesson_file['audio_file']) ? base_url(get_file($lesson_file['audio_file'])) : '',
            'video_url_id' => $video_url_id,
            'video_files' =>$video_data ?? [],            
            // 'quiz_link' => $lesson_file['attachment_type'] == 'quiz' ? base_url('quiz/index/'.$user_id.'/'.$lesson_file['id']) : '',
            'quiz_link' => $lesson_file['attachment_type'] == 'quiz' ? base_url('exam/practice_web_view_new/'.$user_id.'/'.$course_id).'?lesson_file_id='.$lesson_file['id'].'&question_no='.$number_of_questions : '',
            'practice_link' => $lesson_file['attachment_type'] == 'practice' ? base_url('practice/index/'.$user_id.'/'.$lesson_file['id']) : '',
            'progress' => $this->get_file_progress($lesson_file['id'], $lessonType, $user_id),
            'vimeo_access_token' => '',
            'is_completed' => $this->is_file_completed($lesson_file['id'], $lessonType, $user_id),
            'contact_number' => get_settings('contact_whatsapp'),
            'type' => $lessonType
        ];
         
        return $lesson_file_data;
    }
    
    public function get_file_progress($lesson_file_id, $lessonType, $user_id) {
        $this->video_progress_model = new Video_progress_model();
        $this->material_progress_model = new Material_progress_model();
        $this->exam_attempt_model = new Exam_attempt_model();
        
        $progress = 0;
        
        if ($lessonType == 'youtube_video' || $lessonType == 'vimeo_video' || $lessonType == 'audio') {
            $progress_record = $this->video_progress_model->get([
                'user_id' => $user_id, 
                'lesson_file_id' => $lesson_file_id
            ])->getRow();
            
            if ($progress_record) {
                // For completed status, return 100%
                if ($progress_record->status == 1) {
                    return 100;
                }
                
                // Convert TIME to seconds for calculation
                $user_progress = $this->timeToSeconds($progress_record->user_progress);
                $total_duration = $this->timeToSeconds($progress_record->total_duration);
                
                // Calculate percentage if we have valid durations
                if ($total_duration > 0) {
                    $progress = ($user_progress / $total_duration) * 100;
                    // Ensure progress doesn't exceed 100%
                    $progress = min($progress, 100);
                }
            }
        } 
        else if ($lessonType == 'document' || $lessonType == 'article') {
            $completed = $this->material_progress_model->get([
                'user_id' => $user_id, 
                'lesson_file_id' => $lesson_file_id
            ])->getNumRows();
            $progress = $completed > 0 ? 100 : 0;
        } 
        else if ($lessonType == 'quiz') {
            
            // $completed = $this->exam_attempt_model->get([
            //     'user_id' => $user_id, 
            //     'submit_status' => 1, 
            //     'exam_id' => $lesson_file_id
            // ])->getNumRows();
            $completed = $this->practice_attempt_model->get([
                'user_id' => $user_id, 
                'submit_status' => 1, 
                'lesson_file_id' => $lesson_file_id
            ])->getNumRows();
            $progress = $completed > 0 ? 100 : 0;
        }
        
        return (int) round($progress);
    }

    // Helper function to convert TIME format (HH:MM:SS) to seconds
    private function timeToSeconds($time) {
        if (empty($time)) {
            return 0;
        }
        
        $parts = explode(':', $time);
        $seconds = 0;
        
        if (count($parts) == 3) {
            // HH:MM:SS format
            $seconds += $parts[0] * 3600; // hours
            $seconds += $parts[1] * 60;   // minutes
            $seconds += $parts[2];        // seconds
        } 
        elseif (count($parts) == 2) {
            // MM:SS format
            $seconds += $parts[0] * 60;   // minutes
            $seconds += $parts[1];        // seconds
        }
        
        return (int) $seconds;
    }    
    
    public function is_file_completed($lesson_file_id, $lessonType, $user_id){
        $this->video_progress_model = new Video_progress_model();
        $this->material_progress_model = new Material_progress_model();
        $this->exam_attempt_model = new Exam_attempt_model();
        
        $status = 0;
        if($lessonType=='youtube_video' || $lessonType=='vimeo_video' || $lessonType =='audio'){
            $completed = $this->video_progress_model->get(['user_id' => $user_id, 'status' => 1, 'lesson_file_id' => $lesson_file_id])->getNumRows();
            $completion_status = $completed >0 ? 1 : 0;
        }else if($lessonType=='document' || $lessonType=='article'){
            $completed = $this->material_progress_model->get(['user_id' => $user_id, 'lesson_file_id' => $lesson_file_id])->getNumRows();
            $completion_status = $completed >0 ? 1 : 0;
        }else if($lessonType=='quiz'){
            // $completed = $this->exam_attempt_model->get(['user_id' => $user_id, 'submit_status' => 1, 'exam_id' => $lesson_file_id])->getNumRows();
            $completed = $this->practice_attempt_model->get(['user_id' => $user_id, 'submit_status' => 1, 'lesson_file_id' => $lesson_file_id])->getNumRows();
            $completion_status = $completed >0 ? 1 : 0;
        }
        
        $status = $completion_status;
        return $status;
    }
    // public function is_file_completed($lesson_file_id, $attachment_type, $user_id){
    //     $this->video_progress_model = new Video_progress_model();
    //     $this->material_progress_model = new Material_progress_model();
    //     $this->exam_attempt_model = new Exam_attempt_model();
        
    //     $status = 0;
    //     if($attachment_type=='url' || $attachment_type=='audio'){
    //         $completed = $this->video_progress_model->get(['user_id' => $user_id, 'status' => 1, 'lesson_file_id' => $lesson_file_id])->getNumRows();
    //         $completion_status = $completed >0 ? 1 : 0;
    //     }else if($attachment_type=='pdf' || $attachment_type=='article'){
    //         $completed = $this->material_progress_model->get(['user_id' => $user_id, 'lesson_file_id' => $lesson_file_id])->getNumRows();
    //         $completion_status = $completed >0 ? 1 : 0;
    //     }else if($attachment_type=='quiz'){
    //         $completed = $this->exam_attempt_model->get(['user_id' => $user_id, 'submit_status' => 1, 'exam_id' => $lesson_file_id])->getNumRows();
    //         $completion_status = $completed >0 ? 1 : 0;
    //     }
        
    //     $status = $completion_status;
    //     return $status;
    // }
    
    
    public function lesson_video_data($video, $user_id = null) 
    {
        $this->lesson_model = new Lesson_model();
        $this->payment_model = new Payment_model();
        $this->lesson_file_model = new Lesson_file_model();

        $lesson_id = $video['lesson_id'];
        $is_free = 'off';
        
        
        $lesson = $this->lesson_model->get(['id' => $lesson_id])->getRow();
        
        if(!empty($lesson))
        {
            $course_id = $lesson->course_id;
            $purchase_status = $this->payment_model->user_purchase_status($user_id, $course_id);

            $videos = $this->lesson_file_model->get(['lesson_id' => $lesson_id, 'attachment_type' => 'url'],null,['order' => 'asc'])->getResultArray(); //aurora-sort
            $current_index = array_search($video['id'], array_column($videos, 'id'));
            $previous_video_report = null;
            
    
            if ($current_index > 0) {
                $previous_video = $videos[$current_index - 1];
                $previous_video_report = $this->lesson_files_report_model->get([
                    'lesson_file_id' => $previous_video['id'], 
                    'user_id' => $user_id
                ])->getRowArray();
                
                $is_free = !empty($previous_video_report) ? 'on' : 'off';
                $lock_message =  !empty($previous_video_report) ? '' : 'Please upload report';
            }
            else
            {
                $is_free = $purchase_status;
                $lock_message  = '';
            }
        
            
        
            $videodata = [
                'id' => $video['id'] ?? '',
                'title' => $video['title'] ?? '',
                'lesson_id' => $video['lesson_id'] ?? '',
                'description' => $video['summary'] ?? '',
                'duration' => $video['duration'] ?? '',
                'video_type' => $video['video_type'] ?? '',
                'video_url' => $video['video_url'],
                'download_url' => $video['download_url'] ?? '',
                'thumbnail' => valid_file($video['thumbnail']) ? base_url(get_file($video['thumbnail'])) : '',
                'lesson_type' => $video['lesson_type'] ?? '',
                'attachment_type' => $video['attachment_type'] ?? '',
                'free' => $is_free,
                'attachment_url' => !empty($attachment) ? base_url(get_file($attachment->attachment)) : '',
                'vimeo_access_token' => '',
                'is_submitted' => !empty($lesson_file_report) ? '1' : '0',
                'report_file' => !empty($lesson_file_report) ? base_url(get_file($lesson_file_report['report_file'])) : '',
                'file_type' =>!empty($lesson_file_report) ? $lesson_file_report['file_type'] : '',
                'lock_message' => $lock_message
            ];
        }
        else
        {
            $videodata = [];
        }
    
        return $videodata;
    }

    
    
    // public function lesson_video_data($video,$user_id=null){
    //             $logger = service('logger');
    //     // $logger->error('Database Error: ' . db_connect()->getLastQuery());

    //     $this->lesson_model = new Lesson_model();
    //     $this->payment_model = new Payment_model();
    //     $this->lesson_files_report_model = new Lesson_files_report_model();
        
    //     $lesson_id = $video['lesson_id'];
        
    //     $attachment = $this->get(['lesson_id' => $lesson_id, 'attachment_type' => 'pdf'])->getRow();
    //     $attachment_url = !empty($attachment) && valid_file($attachment->attachment) ? base_url(get_file($attachment->attachment)) : '';


     
    //     $lesson = $this->lesson_model->get(['id' => $lesson_id])->getRow();

        
    //     if(!empty($lesson))
    //     {
    //         $course_id = $lesson->course_id;
    //         $purchase_status = $this->payment_model->user_purchase_status($user_id, $course_id);
    //         $lesson_file_report =  $this->lesson_files_report_model->get(['lesson_file_id' => $video['id'],'user_id' => $user_id])->getRowArray();
            


    //         $videodata = [
    //             'id' => $video['id'] ?? '',
    //             'title' => $video['title'] ?? '',
    //             'lesson_id' => $video['lesson_id'] ?? '',
    //             'description' => $video['summary'] ?? '',
    //             'duration' => $video['duration'] ?? '',
    //             'video_type' => $video['video_type'] ?? '',
    //             // 'video_url' => $video['video_url'] ?? '',
    //             'video_url' => 'https://vimeo.com/1024320077',
    //             'download_url' => $video['download_url'] ?? '',
    //             'thumbnail' => valid_file($video['thumbnail']) ? base_url(get_file($video['thumbnail'])) : '',
    //             'lesson_type' => $video['lesson_type'] ?? '',
    //             'attachment_type' => $video['attachment_type'] ?? '',
    //             'free' => $video['free'] == 'on' ? 'on' : $purchase_status,
    //             'attachment_url' => $attachment_url,
    //             'vimeo_access_token' => '',
    //             'is_submitted' =>  !empty($lesson_file_report) ? '1' :'0',
    //             'report_file' =>  !empty($lesson_file_report) ? base_url(get_file($lesson_file_report['report_file'])) : '',

    //         ];
    //     }
    //     else
    //     {
    //         $videodata = [];
    //     }
    //     return $videodata;
    // }
    
    public function lesson_material_data($material,$user_id=null){
        $this->lesson_model = new Lesson_model();
        $this->payment_model = new Payment_model();
        $lesson_data = $this->lesson_model->get(['id' => $material['lesson_id']])->getRow();
        $purchase_status = $this->payment_model->user_purchase_status($user_id, $lesson_data->course_id, $lesson_data->subject_id);
        $videodata = [
            'id' => $material['id'] ?? '',
            'title' => $material['title'] ?? '',
            'lesson_id' => $material['lesson_id'] ?? '',
            'attachment' => valid_file($material['attachment']) ? base_url(get_file($material['attachment'])) : '',
            'thumbnail' => valid_file($material['thumbnail']) ? base_url(get_file($material['thumbnail'])) : '',
            'lesson_type' => $material['lesson_type'] ?? '',
            'attachment_type' => $material['attachment_type'] ?? '',
            'free' => $material['free'] == 'on' ? 'on' : $purchase_status,
                        
        ];
        return $videodata;
    }
    
    public function save_user_video_progress($user_id,$course_id,$lesson_file_id,$lesson_duration,$user_progress){
        $this->video_progress_model = new Video_progress_model();
        $progress_exist = $this->video_progress_model->get(['user_id' => $user_id, 'lesson_file_id' => $lesson_file_id,'course_id' => $course_id]);
        if($progress_exist->getNumRows() > 0){
            $progress_data = $progress_exist->getRowArray();
            
            // $exist_progress = new DateTime($progress_data['user_progress']);
            // $fetching_progress = new DateTime($user_progress);
            // $total_progress = new DateTime($lesson_duration);

            // Convert times to seconds for easy comparison
            $exist_progress_sec    = strtotime($progress_data['user_progress']);
            $fetching_progress_sec = strtotime($user_progress);
            $total_progress_sec    = strtotime($lesson_duration);

            $grace_seconds = 5;

            // if($exist_progress < $fetching_progress ){ 
            //     $update_data['total_duration'] = $lesson_duration; 
            //     $update_data['user_progress'] = $user_progress; 
            //     $update_data['updated_by'] = $user_id; 
            //     $update_data['updated_at'] = date('Y-m-d H:i:s'); 
            //     if($fetching_progress >= $total_progress){
            //         $update_data['status'] = 1; 
            //         }
            //     else{ $update_data['status'] = 0; }
            //     $this->video_progress_model->edit($update_data,['id' => $progress_data['id'], 'user_id' => $user_id, 'lesson_file_id' => $lesson_file_id, 'course_id' => $course_id]);
            // }

            if ($fetching_progress_sec + $grace_seconds > $exist_progress_sec) {

                $update_data['total_duration'] = $lesson_duration;
                $update_data['user_progress']  = $user_progress;
                $update_data['updated_by']     = $user_id;
                $update_data['updated_at']     = date('Y-m-d H:i:s');
                
                // Check completion
                if ($fetching_progress_sec >= $total_progress_sec - $grace_seconds) {
                    $update_data['status'] = 1; // Completed
                } else {
                    $update_data['status'] = 0;
                }
                
                $this->video_progress_model->edit($update_data,['id' => $progress_data['id'], 'user_id' => $user_id, 'lesson_file_id' => $lesson_file_id, 'course_id' => $course_id]);
            }
                
                
            
        }else{
            $data['user_id']        = $user_id;
            $data['course_id']      = $course_id;
            $data['lesson_file_id'] = $lesson_file_id;
            $data['total_duration'] = $lesson_duration;
            $data['user_progress']  = $user_progress;
            $data['created_by']    = $user_id;
            $data['created_at']    = date('Y-m-d H:i:s');
            
            $fetching_progress = strtotime($user_progress);
            $total_progress = strtotime($lesson_duration);

            $grace_seconds = 5;

            if($fetching_progress + $grace_seconds >= $total_progress){
                $data['status']  = 1;
            }else{
                $data['status']  = 0;
            }
            $this->video_progress_model->add($data);
        }
    }
    
    
    public function save_user_material_progress($user_id,$course_id,$lesson_file_id,$attachment_type){
        $this->material_progress_model = new Material_progress_model();
        $progress_exist = $this->material_progress_model->get(['user_id' => $user_id, 'lesson_file_id' => $lesson_file_id,'course_id' => $course_id]);
        if($progress_exist->getNumRows() ==0){ 
            $data['user_id']        = $user_id;
            $data['course_id']      = $course_id;
            $data['lesson_file_id'] = $lesson_file_id; 
            $data['attachment_type'] = $attachment_type; 
            $data['created_by']    = $user_id;
            $data['created_at']    = date('Y-m-d H:i:s');
            return $this->material_progress_model->add($data);
        }
        
    }
    
    public function get_video_count($lesson_id){
        $query = $this->db->table('lesson_files')
            ->select('*')
            ->where('lesson_id', $lesson_id)
            ->where('lesson_type','video')
            ->get()
            ->getNumRows();
        return $query;
    }
    
    
    
    public function get_completed_files($lesson_id, $user_id,$course_id=NULL){
        $this->video_progress_model = new Video_progress_model();
        $this->material_progress_model = new Material_progress_model();
        $this->exam_attempt_model = new Exam_attempt_model();
        $this->practice_attempt_model = new Practice_attempt_model();
        //$logger = service('logger');
        
        if($lesson_id!=NULL){
            $video_ids = array_column($this->get(['lesson_id' => $lesson_id,'attachment_type' => ['url','audio']],null,['order' => 'asc'])->getResultArray(),'id'); //aurora-sort
            $material_ids = array_column($this->get([
                'lesson_id' => $lesson_id,
                'attachment_type' => ['pdf', 'article']
            ],null,['order' => 'asc'])->getResultArray(),'id'); //aurora-sort
            $exam_ids = array_column($this->get(['lesson_id' => $lesson_id,'attachment_type' => 'quiz'],null,['order' => 'asc'])->getResultArray(),'id'); //aurora-sort
        }else{
            $video_ids = [];
            $material_ids = [];
            $exam_ids = [];
        }
        
        if($course_id==NULL){
            $video_completed     =  $video_ids!=NULL ? $this->video_progress_model->get(['user_id' => $user_id, 'status' => 1, 'lesson_file_id' => $video_ids],NULL,NULL,NULL,['lesson_file_id'])->getNumRows() : 0;
            $materials_completed =  $material_ids!=NULL ? $this->material_progress_model->get(['user_id' => $user_id, 'lesson_file_id' => $material_ids],NULL,NULL,NULL,['lesson_file_id'])->getNumRows() : 0;
            $exam_completed      =  $exam_ids!=NULL ? $this->exam_attempt_model->get(['user_id' => $user_id, 'submit_status' => 1, 'exam_id' => $exam_ids],NULL,NULL,NULL,['exam_id'])->getNumRows() : 0;
            $quiz_completed      =  $exam_ids!=NULL ? $this->practice_attempt_model->get(['user_id' => $user_id, 'submit_status' => 1, 'lesson_file_id' => $exam_ids],NULL,NULL,NULL,['lesson_file_id'])->getNumRows() : 0;
            $total_completed     = $video_completed+$materials_completed+$exam_completed+$quiz_completed;
            return $total_completed;
        }
        else{ //aurora
            $video_completed     =  $video_ids!=NULL ? $this->video_progress_model->get(['user_id' => $user_id, 'status' => 1, 'lesson_file_id' => $video_ids,'course_id' => $course_id],NULL,NULL,NULL,['lesson_file_id'])->getNumRows() : 0;
            $materials_completed =  $material_ids!=NULL ? $this->material_progress_model->get(['user_id' => $user_id, 'lesson_file_id' => $material_ids],NULL,NULL,NULL,['lesson_file_id'])->getNumRows() : 0;
            // $materials_completed =  $material_ids!=NULL ? $this->material_progress_model->get(['user_id' => $user_id, 'lesson_file_id' => $material_ids, 'course_id' => $course_id],NULL,NULL,NULL,['lesson_file_id'])->getNumRows() : 0;  //aurora - removed course_id from where
            $exam_completed      =  $exam_ids!=NULL ? $this->exam_attempt_model->get(['user_id' => $user_id, 'submit_status' => 1, 'exam_id' => $exam_ids],NULL,NULL,NULL,['exam_id'])->getNumRows() : 0;
            $quiz_completed      =  $exam_ids!=NULL ? $this->practice_attempt_model->get(['user_id' => $user_id, 'submit_status' => 1, 'lesson_file_id' => $exam_ids],NULL,NULL,NULL,['lesson_file_id'])->getNumRows() : 0;
            $total_completed     = $video_completed+$materials_completed+$exam_completed+$quiz_completed;
            return $total_completed;
        }
    }

}
