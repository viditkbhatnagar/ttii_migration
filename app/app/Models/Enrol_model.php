<?php namespace App\Models;

use CodeIgniter\Model;
use App\Models\Users_model;
use App\Models\Course_model;
use App\Models\Student_fee_model;

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
    public function enrol_course($user_id, $course_id,$package_id=null){
                $logger = service('logger');

         $this->users_model = new Users_model();
         
         
        //check if already enrolled for the same course
        $exist = $this->is_user_enrolled($user_id, $course_id);



        
        if($exist > 0) {
            // return false as already enrolled
            return false;
        }else{
            
            $enrol = [
                'user_id' => $user_id,
                'course_id' => $course_id,
                'enrollment_date' => date('Y-m-d'),
                'enrollment_status' => 'Active',
                'mode_of_study' => 'Online',
                'package_id'=>$package_id,
                'created_by' => $user_id,
                'created_at' => date('Y-m-d H:i:s'),
            ];
            $enrolnow = $this->add($enrol);
            
             $updata = [
                'course_id' => $course_id,
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            $response = $this->users_model->edit($updata, ['id' => $user_id]);
            
            return $response;
        }
    }
    
    // is user enrolled
    public function is_user_enrolled($user_id, $course_id){
        return $this->get(['user_id' => $user_id, 'course_id' => $course_id])->getNumRows();
    }
    
    public function get_enroled_students($course_id){
        $query = $this->db->table('enrol')
                ->select('enrol.user_id, enrol.course_id, users.id, users.name, users.otp, users.premium, users.phone, users.status, users.verification_code')
                ->join('users', 'users.id = enrol.user_id','left')
                ->where('enrol.course_id', $course_id);
        
        $querys = $query->get();
        
        $resultArray = $querys->getResultArray();
        return $resultArray;
    }
    public function get_enroled_courses($student_id){
        $query = $this->db->table('enrol')
                ->select('enrol.user_id, enrol.course_id, users.id, course.title, enrol.created_at as enroled_on')
                ->join('users', 'users.id = enrol.user_id','left')
                ->join('course', 'course.id = enrol.course_id','left')
                ->where('enrol.user_id', $student_id)
                ->where('course.deleted_at', null)
                ->where('enrol.deleted_at', null);
        
        $querys = $query->get();
        
        $resultArray = $querys->getResultArray();
        return $resultArray;
    }

    public function get_payment_details($student_id, $course_id){
         $this->student_fee_model = new Student_fee_model();

        return $this->student_fee_model->get(['user_id' => $student_id, 'course_id' => $course_id])->getResultArray();
    }

}
