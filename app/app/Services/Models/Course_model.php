<?php namespace App\Models;

use CodeIgniter\Model;
use App\Models\Enrol_model;

class Course_model extends Base_model
{
    protected $table         = 'course';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Course';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];

    
    public function course_data($courses){
        $this->enrol_model = new Enrol_model();
        
        $coursedata = [
            'id' => $courses->id ?? '',
            'title' => $courses->title ?? '',
            'status' => $courses->status ?? '',
            'course_type' => $courses->course_type ?? '',
            'is_online' => $courses->is_online ?? '',
            'short_description' => $courses->short_description ?? '',
            'description' => $courses->description ?? '',
            'category_id' => $courses->category_id ?? '',
            'thumbnail' => valid_file($courses->thumbnail) ? base_url(get_file($courses->thumbnail)) : '',
            'course_icon' => valid_file($courses->course_icon) ? base_url(get_file($courses->course_icon)) : '',
            'video_url' => $courses->video_url ?? '',
            'enrolments' => $this->enrol_model->get(['course_id' => $courses->id])->getNumRows()
        ];
        return $coursedata;
    }
}
