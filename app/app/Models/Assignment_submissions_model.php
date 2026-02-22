<?php namespace App\Models;

use CodeIgniter\Model;

class Assignment_submissions_model extends Base_model
{
    protected $table         = 'assignment_submissions';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Assignment_submissions';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
    



}
