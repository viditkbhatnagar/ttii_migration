<?php namespace App\Models;

use CodeIgniter\Model;

class Package_model extends Base_model
{
    protected $table         = 'package';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Package';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];


    public function package_data($package){

        $packagedata = [
            'id' => $package['id'] ?? '',
            'title' => $package['title'] ?? '',
            'type' => $package['type'] ?? '',
            'category_id' => $package['category_id'] ?? '',
            'course_id' => $package['course_id'] ?? '',
            'section_id' => $package['section_id'] ?? '',
            'amount' => $package['amount'] ?? '',
            'discount' => $package['discount'] ?? '',
            'is_free' => $package['is_free'] ?? '',
            'package_type' => $package['package_type'] ?? '',
            'remarks' => $package['remarks'] ?? '',
            'offline' => $package['offline'] ?? '',
            'description' => $package['description'] ?? '',
            'start_day' => $package['start_day'] ?? '',
            'end_day' => $package['end_day'] ?? '',
            'duration' => $package['duration'] ?? '',
        ];
        return $packagedata;
    }
}
