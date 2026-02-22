<?php namespace App\Models;

use CodeIgniter\Model;

class Country_model extends Base_model
{
    protected $table         = 'countries';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Country';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title','nice_name'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required|min_length[2]',
  
    ];





}