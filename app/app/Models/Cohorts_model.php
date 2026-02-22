<?php namespace App\Models;

use CodeIgniter\Model;

class Cohorts_model extends Base_model
{
    protected $table         = 'cohorts';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Cohorts';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title', 'cohort_id', 'course_id', 'subject_id', 'language_id', 'instructor_id', 'start_date', 'end_date', 'created_by', 'created_at', 'updated_by', 'updated_at', 'deleted_by', 'deleted_at'];
    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    


}
