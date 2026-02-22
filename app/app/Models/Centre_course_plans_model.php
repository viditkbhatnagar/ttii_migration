<?php namespace App\Models;

use CodeIgniter\Model;

class centre_course_plans_model extends Base_model
{
    protected $table         = 'centre_course_plans';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\centre_course_plans';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    

}
