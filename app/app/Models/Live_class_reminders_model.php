<?php namespace App\Models;

use CodeIgniter\Model;

class Live_class_reminders_model extends Base_model
{
    protected $table         = 'live_class_reminders';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Live_class_reminders';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['live_class_id','user_id','status'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required|min_length[2]',
  
    ];





}