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
    
    
    public function lesson_data($lesson){
        $this->lesson_file_model = new Lesson_file_model();
        
        $lessondata = [
            'id' => $lesson['id'] ?? '',
            'title' => $lesson['title'] ?? '',
            'course_id' => $lesson['course_id'] ?? '',
            'subject_id' => $lesson['subject_id'] ?? '',
            'summary' => $lesson['summary'] ?? '',
            'free' => $lesson['free'] ?? '',
            'lesson_files_count' => $this->lesson_file_model->get(['lesson_id' => $lesson['id']])->getNumRows()
        ];
        return $lessondata;
    }


}
