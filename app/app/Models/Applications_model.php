<?php namespace App\Models;

use CodeIgniter\Model;


use App\Models\Users_model;
use App\Models\Course_model;
use App\Models\Package_model;

class Applications_model extends Base_model
{
    protected $table         = 'applications';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Applications';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];  
    
    

}
