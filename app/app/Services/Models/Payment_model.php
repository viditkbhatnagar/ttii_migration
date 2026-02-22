<?php namespace App\Models;

use CodeIgniter\Model;

use App\Models\Users_model;
use App\Models\Course_model;
use App\Models\Package_model;

class Payment_model extends Base_model
{
    protected $table         = 'payment_info';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Payment';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
     
    
    public function user_purchase_status($user_id, $course_id){
        $logger = service('logger');
        $this->users_model = new Users_model();
        $this->course_model = new Course_model();
        $this->package_model = new Package_model();
        
        $free = 'off';
        $user_data = $this->users_model->get(['id' => $user_id])->getRow();
        $premium = $user_data->premium ?? 0;
        $role_id = $user_data->role_id ?? 0;

        if($role_id==3){
            $free = 'on';
        }else{
            if($premium != 1){
                $course_premium =  $this->course_model->get(['id' => $course_id])->getRow()->is_free_course;
                if($course_premium!=1){
                    $package = $this->package_model->get(['course_id' => $course_id, 'type'=>1]);
                    if($package->getNumRows() > 0){
                        $package_id = $package->getRow()->id;
                        $payment = $this->get(['user_id' => $user_id, 'package_id' => $package_id])->getNumRows();
                        if($payment > 0){
                            $free = 'on';
                        }
                    }
                }else{
                    $free = 'on';
                }
            }else{
                $free = 'on';
            }
        }

        return $free;
    }

}
