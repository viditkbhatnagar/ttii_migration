<?php namespace App\Models;

use CodeIgniter\Model;
use App\Models\Payment_model;
use App\Models\Users_model;
use App\Models\Course_model;

class Event_registration_model extends Base_model
{
    protected $table         = 'event_registration';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Event_registration';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
    


}
