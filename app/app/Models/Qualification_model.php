<?php namespace App\Models;

use CodeIgniter\Model;
use App\Models\Enrol_model;
use App\Models\User_logs_model;
use App\Services\Otp_service;

class Qualification_model extends Base_model
{
    protected $table         = 'qualification';      // Database table name
    protected $primaryKey    = 'qualification_id';         // Primary key of the table
    protected $returnType    = 'App\Entities\User';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = []; 
    
    // Optional: Define validation rules
    protected $validationRules    = [
       
    ];

}
