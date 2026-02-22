<?php namespace App\Models;

use CodeIgniter\Model;

class Recorded_events_model extends Base_model
{
    protected $table         = 'recorded_events';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Recorded_events';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
   
   


}
