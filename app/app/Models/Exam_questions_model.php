<?php namespace App\Models;

use CodeIgniter\Model;
use CodeIgniter\Database\ConnectionInterface;


class Exam_questions_model extends Base_model
{
    protected $table         = 'exam_questions';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Quiz';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
    
    
    public function get_exam_question($exam_id){
        $query = $this->db->table('exam_questions')
            ->select('question_bank.*')
            ->join('question_bank', 'question_bank.id = exam_questions.question_id')
            ->where('exam_questions.exam_id', $exam_id)
            ->where('exam_questions.deleted_at', NULL)
            // ->orderBy('exam_questions.id', 'desc')
            ->get()
            ->getResultArray();
        return $query;
    }
}
