<?php namespace App\Models;

use CodeIgniter\Model;

class Teachers_subjects_model extends Base_model
{
    protected $table         = 'teachers_subjects_model';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Teachers_subjects_model';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];

}
