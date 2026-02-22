<?php namespace App\Models;

use CodeIgniter\Model;

class Quiz_model extends Base_model
{
    protected $table         = 'quiz';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Quiz';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = [
        'lesson_file_id', 
        'question', 
        'question_type', 
        'answer_id', 
        'answer_ids', 
        'answers', 
        'created_by', 
        'updated_by', 
        'deleted_by'
    ];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'question' => 'required',
    ];
    
    /**
     * Get quiz questions by lesson_file_id
     */
    public function get_quiz_questions($lesson_file_id) {
        return $this->where('lesson_file_id', $lesson_file_id)
                   ->where('deleted_at', NULL)
                   ->orderBy('id', 'asc')
                   ->get()
                   ->getResultArray();
    }

}
