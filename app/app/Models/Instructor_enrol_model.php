<?php namespace App\Models;

use CodeIgniter\Model;

class Instructor_enrol_model extends Base_model
{
    protected $table         = 'instructor_enrol';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Instructor_enrol';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
 

}
