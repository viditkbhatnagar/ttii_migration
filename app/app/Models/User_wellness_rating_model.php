<?php namespace App\Models;

use CodeIgniter\Model;

class User_wellness_rating_model extends Base_model
{
    protected $table         = 'user_wellness_rating';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\User_wellness_rating';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    

}