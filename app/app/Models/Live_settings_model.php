<?php namespace App\Models;

use CodeIgniter\Model;

class Live_settings_m extends Base_model
{
    protected $table         = 'live_settings';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Live_settings';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['meeting_id'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'meeting_id' => 'required',
    ];
    
    
}
