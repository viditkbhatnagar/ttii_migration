<?php namespace App\Models;

use CodeIgniter\Model;
use App\Models\Lesson_file_model;

class Lesson_model extends Base_model
{
    protected $table         = 'lesson';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Lesson';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
    
   

    
    
    public function lesson_data($lesson, $user_id=0, $purchase_status=null, $lesson_key = NULL, $course_id = NULL){
        $this->lesson_file_model = new Lesson_file_model();

        $total_lesson_files = $this->lesson_file_model->get(['lesson_id' => $lesson['id']])->getNumRows();
        $total_completed_lesson_files = $this->lesson_file_model->get_completed_files($lesson['id'], $user_id, $course_id);
        $lesson_file_progress = $total_lesson_files > 0 ? ($total_completed_lesson_files/$total_lesson_files)*100 : 0;
        
        if($lesson_key==0){
            $lock = 0;
        }else {
            $lock = 1;
        }
        
        if($total_lesson_files > 0 && $total_lesson_files <= $total_completed_lesson_files){
            $is_completed = 1;
        }else if($lesson_key == 0 && $total_lesson_files == 0){
            $is_completed = 1;
        }else{
            $is_completed = 0;
        }
        
        // Set lock message based on the lock status
        $lock_message = $lock == 1 ? "Please complete the previous lesson" : "";
        $lesson_files = $this->lesson_file_model->get(['lesson_id' => $lesson['id']],null,['order' => 'asc'])->getResultArray(); //aurora-sort
        
        $lesson_file_data = [];
        foreach($lesson_files as $key => $lesson_file){
            $lesson_file_data[$key] = $this->lesson_file_model->lesson_file_data($lesson_file, $lesson['id'], $user_id);
        }
        $lessondata = [
            'id' => $lesson['id'] ?? '',
            'title' => $lesson['title'] ?? '',
            'course_id' => $lesson['course_id'] ?? '',
            'subject_id' => $lesson['subject_id'] ?? '',
            'summary' => $lesson['summary'] ?? '',
            'free' => $lesson['free'] == 'on' ? 'on' : $purchase_status,
            'thumbnail' => valid_file($lesson['thumbnail']) ? base_url(get_file($lesson['thumbnail'])) : '',
            'video_count' => $this->lesson_file_model->get_video_count(['lesson_id' => $lesson['id']]),
            'practice_link' => base_url('exam/practice_web_view/'.$user_id.'/'.$lesson['course_id']),
            'lesson_files_count' => $total_lesson_files,
            'completed_lesson_files' => $total_completed_lesson_files,
            'completed_percentage' => round($lesson_file_progress),
            'lock' => $lock,
            'lock_message' => $lock_message,
            'is_completed' => $is_completed,
            'lesson_files' => $lesson_file_data
        ];
        return $lessondata;
    }


}
