<?php namespace App\Models;

use CodeIgniter\Model;

class Counsellor_target_model extends Base_model
{
    protected $table         = 'counsellor_target';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\counsellor_target';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
        


}
