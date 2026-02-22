<?php namespace App\Models;

use CodeIgniter\Model;

class Assignment_reminders_model extends Base_model
{
    protected $table         = 'assignment_reminders';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Assignment_reminders';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['assignment_id','user_id','status'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'assignment_id' => 'required',
        'user_id' => 'required',
        'status' => 'required',
    ];
    

}
