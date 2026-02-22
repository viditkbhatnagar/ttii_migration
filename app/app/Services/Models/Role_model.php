<?php namespace App\Models;

use CodeIgniter\Model;

class Role_model extends Base_model
{
    protected $table         = 'role';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Role';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];

    protected $validationMessages = [
        'title' => [
            'required' => 'Role Title is Required!'
        ]
    ];

}
