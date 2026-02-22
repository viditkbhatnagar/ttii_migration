<?php namespace App\Models;

use CodeIgniter\Model;

class File_model extends Base_model
{
    protected $table         = 'files';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    // protected $returnType    = 'App\Entities\Settings';  // Entity class name
    // protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['name', 'folder_id', 'path'];  // Fields that can be manipulated


}
