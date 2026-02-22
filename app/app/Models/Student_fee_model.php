<?php namespace App\Models;

use CodeIgniter\Model;

class Student_fee_model extends Base_model
{
    protected $table         = 'student_payments';      // Database table name
    protected $primaryKey    = 'student_payment_id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Student_fee';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = [];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
    ];


}