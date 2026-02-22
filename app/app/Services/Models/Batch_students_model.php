<?php namespace App\Models;

use CodeIgniter\Model;

class Batch_students_model extends Base_model
{
    protected $table         = 'batch_students';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Batch_students';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
  
  


}
