<?php namespace App\Models;

use CodeIgniter\Model;

class Instructor_students_model extends Base_model
{
    protected $table         = 'instructor_students';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Instructor_students';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
    

}
