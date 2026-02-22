<?php namespace App\Models;

use CodeIgniter\Model;
use CodeIgniter\Database\ConnectionInterface;


class Quiz_model extends Base_model
{
    protected $table         = 'quiz';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Quiz';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];

    
    public function get_upcoming_exams($course_id){
        $current_date = date('Y-m-d');
        $current_time = date('H:i:s');
        
        $query = $this->db->table('quiz')
                          ->where('course_id', $course_id)
                          ->where('from_date >=', $current_date)
                          ->groupStart()
                          ->where('to_date >', $current_date)
                          ->orWhere('to_date', $current_date)
                          ->where('to_time >=', $current_time)
                          ->groupEnd();
        return $query->get()->getResultArray();

    }
    
}
