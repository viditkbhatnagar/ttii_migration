<?php namespace App\Models;

use CodeIgniter\Model;

class Student_document_model extends Base_model
{
    protected $table         = 'student_document';      // Database table name
    protected $primaryKey    = 'student_document_id';         // Primary key of the table
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = [];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
    ];





}