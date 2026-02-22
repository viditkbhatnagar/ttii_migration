<?php namespace App\Models;

use CodeIgniter\Model;

class Enrol_model extends Base_model
{
    protected $table         = 'enrol';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Enrol';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
    
    // enrol course
    public function enrol_course($user_id, $course_id){
        //check if already enrolled for the same course
        $exist = $this->is_user_enrolled($user_id, $course_id);
        if($exist > 0) {
            // return false as already enrolled
            return false;
        }else{
            
            $enrol = [
                'user_id' => $user_id,
                'course_id' => $course_id,
                'created_by' => $user_id,
                'created_at' => date('Y-m-d H:i:s'),
            ];
            return $this->add($enrol);
        }
    }
    
    // is user enrolled
    public function is_user_enrolled($user_id, $course_id){
        return $this->get(['user_id' => $user_id, 'course_id' => $course_id])->getNumRows();
    }

}
