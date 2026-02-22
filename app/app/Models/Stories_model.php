<?php namespace App\Models;

use CodeIgniter\Model;

class Stories_model extends Base_model
{
    protected $table         = 'stories';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Stories';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];


    public function story_data($story){

        $storydata = [
            'id'        => $story['id'] ?? '',
            'title'     => $story['title'] ?? '',
            'course_id' => $story['course_id'] ?? '',
            'date'      => $story['date'] ?? '',
            'image'     => valid_file($story['image']) ? base_url(get_file($story['image'])) : '',
            'status'    => $story['status'] ?? '',
        ];
        return $storydata;
    }
    
    public function get_stories($course_id){
        if ($course_id == 0) {
            $query = $this->get(['course_id' => 0, 'date' => date('Y-m-d'), 'status' => 1])->getResultArray();
        } else if ($course_id > 0) {
            $query = $this->get(['course_id' => [0, $course_id], 'date' => date('Y-m-d'),'status' => 1])->getResultArray();
        } else {
            $query = [];
        }
        return $query;
    }
}
