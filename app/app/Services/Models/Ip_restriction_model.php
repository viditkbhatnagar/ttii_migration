<?php namespace App\Models;

use CodeIgniter\Model;

class Ip_restriction_model extends Base_model
{
    protected $table         = 'ip_restriction';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Ip_restriction';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['user_id','team_id','ip_from','ip_to','comments'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];


}
