<?php namespace App\Models;

use CodeIgniter\Model;
use DateTime;

class Lesson_files_report_model extends Base_model
{
    protected $table         = 'lesson_files_report';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Lesson_files_report';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
    
}
