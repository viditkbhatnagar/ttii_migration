<?php namespace App\Models;

use CodeIgniter\Model;

class Folder_model extends Base_model
{
    protected $table         = 'folders';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    // protected $returnType    = 'App\Entities\Settings';  // Entity class name
    // protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['name', 'parent_id'];  // Fields that can be manipulated


}
