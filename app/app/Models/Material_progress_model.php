<?php namespace App\Models;

use CodeIgniter\Model;

class Material_progress_model extends Base_model
{
    protected $table         = 'material_progress_status';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Material_progress';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];


}
