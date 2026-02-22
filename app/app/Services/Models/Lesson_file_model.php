<?php namespace App\Models;

use CodeIgniter\Model;
use App\Models\Lesson_model;

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
    
    
    public function lesson_video_data($video){
        $this->lesson_model = new Lesson_model();
        $this->payment_model = new Payment_model();
        
        $course_id = $this->lesson_model->get(['id' => $video['lesson_id']])->getRow()->course_id;
        $purchase_status = $this->payment_model->user_purchase_status($this->user_id, $course_id);
        $videodata = [
            'id' => $video['id'] ?? '',
            'title' => $video['title'] ?? '',
            'lesson_id' => $video['lesson_id'] ?? '',
            'duration' => $video['duration'] ?? '',
            'video_type' => $video['video_type'] ?? '',
            'video_url' => $video['video_url'] ?? '',
            'download_url' => $video['download_url'] ?? '',
            'thumbnail' => valid_file($video['thumbnail']) ? base_url(get_file($video['thumbnail'])) : '',
            'lesson_type' => $video['lesson_type'] ?? '',
            'attachment_type' => $video['attachment_type'] ?? '',
            'free' => $video['free'] == 'on' ? 'on' : $purchase_status,

        ];
        return $videodata;
    }
    
    public function lesson_material_data($material){
        $this->lesson_model = new Lesson_model();
        $this->payment_model = new Payment_model();
        
        $course_id = $this->lesson_model->get(['id' => $material['lesson_id']])->getRow()->course_id;
        $purchase_status = $this->payment_model->user_purchase_status($this->user_id, $course_id);
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
    
    
    public function save_user_video_progress($user_id,$lesson_file_id,$lesson_duration,$user_progress){
        $progress_exist = $this->db->get_where('video_progress_status',['user_id' => $user_id, 'lesson_file_id' => $lesson_file_id]);
        if($progress_exist->num_rows() > 0){
            $progress_data = $progress_exist->row_array();
            
            $exist_progress = new DateTime($progress_data['user_progress']);
            $fetching_progress = new DateTime($user_progress);
            $total_progress = new DateTime($lesson_duration);

            if($exist_progress < $fetching_progress ){
                $update_data['total_duration'] = $lesson_duration;
                $update_data['user_progress']  = $user_progress;
                $update_data['update_date']    = date('Y-m-d H:i:s');
                
                if($fetching_progress >= $total_progress){
                    $update_data['status']  = 1;
                }else{
                    $update_data['status']  = 0;
                }
                
                $this->db->where('user_id', $user_id);
                $this->db->where('lesson_file_id', $lesson_file_id);
                $this->db->update('video_progress_status', $update_data);
            }
        }else{
            $data['user_id']        = $user_id;
            $data['lesson_file_id'] = $lesson_file_id;
            $data['total_duration'] = $lesson_duration;
            $data['user_progress']  = $user_progress;
            $data['create_date']    = date('Y-m-d H:i:s');
            
            $fetching_progress = new DateTime($user_progress);
            $total_progress = new DateTime($lesson_duration);
            
            log_message("error","fetching_prgs ".print_r($fetching_progress,true));
            log_message("error","total_pgrs ".print_r($total_progress,true));
                
            if($fetching_progress >= $total_progress){
                $data['status']  = 1;
                
            }else{
                $data['status']  = 0;
            }
             
            $this->db->insert('video_progress_status', $data);
        }
       
    }

}
