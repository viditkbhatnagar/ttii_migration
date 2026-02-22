<?php namespace App\Models;

use CodeIgniter\Model;
use App\Models\Payment_model;
use App\Models\Users_model;
use App\Models\Course_model;

class Short_videos_model extends Base_model
{
    protected $table         = 'short_videos';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Short_videos';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    


}
