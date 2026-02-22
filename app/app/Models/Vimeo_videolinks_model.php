<?php namespace App\Models;

use CodeIgniter\Model;

class Vimeo_videolinks_model extends Base_model
{
    protected $table         = 'vimeo_videolinks';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Vimeo_videolinks';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = [
        'lesson_file_id',
        'quality',
        'rendition', 
        'height',
        'width',
        'type',
        'link',
        'fps',
        'size',
        'public_name',
        'size_short',
        'download_link',
        'created_by',
        'updated_by',
        'deleted_by'
    ];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'lesson_file_id' => 'required|integer',
    ];
}
