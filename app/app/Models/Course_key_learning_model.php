<?php namespace App\Models;

use CodeIgniter\Model;

class Course_key_learning_model extends Base_model
{
    protected $table         = 'course_key_learning';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Course_key_learning';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
}
