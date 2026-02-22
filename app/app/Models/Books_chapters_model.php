<?php namespace App\Models;

use CodeIgniter\Model;

class Books_chapters_model extends Base_model
{
    protected $table         = 'books_chapters';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Books_chapters';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['id','chapter','description'];  // Fields that can be manipulated

    // Optional: Define validation rules
    // protected $validationRules    = [
    //     'title' => 'required',
    // ];
    
 

}