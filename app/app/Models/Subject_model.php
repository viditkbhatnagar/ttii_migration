<?php namespace App\Models;

use CodeIgniter\Model;

class Subject_model extends Base_model
{
    protected $table         = 'subject';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Section';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];

    public function subject_data($subject, $user_id){
        $this->lesson_model = new Lesson_model();
        $this->payment_model = new Payment_model();
        $subject_purchase_status = $this->payment_model->user_purchase_status($user_id, $subject['course_id'], $subject['id']);

        $sujectdata = [
            'id' => $subject['id'] ?? '',
            'title' => $subject['title'] ?? '',
            'course_id' => $subject['course_id'] ?? '',
            'thumbnail' => valid_file($subject['thumbnail']) ? base_url(get_file($subject['thumbnail'])) : '',
            'icon' => valid_file($subject['icon']) ? base_url(get_file($subject['icon'])) : '',
            'free' => $subject['free'] == 'on' ? 'on' : $subject_purchase_status,
            'lesson_count' => $this->lesson_model->get(['subject_id' => $subject['id']])->getNumRows(),
        ];
        return $sujectdata;
    }
}
