<?php namespace App\Models;

use CodeIgniter\Model;

class Feed_watched_model extends Base_model
{
    protected $table         = 'feed_watched';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Feed_watched';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    

}
