<?php namespace App\Models;

use CodeIgniter\Model;

class Exam_attempt_model extends Base_model
{
    protected $table         = 'exam_attempt';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Category';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
    
    public function get_exam_attempt_count($user_id, $exam_id){
        $this->db->where('exam_id', $exam_id);
        $this->db->where('quiz_id', $quiz_id);
        $attempt = $this->db->get('quiz_attempt');
        return $attempt->getNumRows();
    }
    

}
