<?php namespace App\Models;

use CodeIgniter\Model;

class Coupon_code_model extends Base_model
{
    protected $table         = 'coupon_code';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Feed';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
    
    public function plans_by_coupon_get($course_id = 0, $user_id = 0, $package_id="", $coupon_code = "") {
        $this->payments_model = new Payments_model();
        $this->enrol_model    = new Enrol_model();
        $this->users_model    = new Users_model();
        date_default_timezone_set("Asia/Calcutta");
        
        $logger = service('logger');
        
        if($package_id>0){
            $query = $this->db->table('package')
                       ->select('*')
                       ->where('package.id',$package_id)
                       ->where('package.deleted_at',NULL);
            $package = $query->get();
        }else{
            $query = $this->db->table('package')
                       ->select('*')
                       ->where('package.course_id',$course_id)
                       ->where('package.deleted_at',NULL);
                    //   if (!empty($package_type)) {
                    //         $query->where('package.type', $package_type);
                    //     }
            $package = $query->get();
        }

            if($package->getNumRows() > 0){
                $package_id = array_column($package->getResultArray(), 'id');
                $package_id[] = 0; 
                {
                    $query = $this->db->table('coupon_code')
                             ->where('code', $coupon_code)
                             ->whereIn('package_id', $package_id)
                             ->whereIn('user_id', [$user_id, 0])
                             ->where('validity', 1)
                             ->where('start_date<=', date('Y-m-d'))
                             ->where('end_date>=', date('Y-m-d'));
                    $coupon = $query->get();
                    
                    $logger->error('coupn test Error: ' . db_connect()->getLastQuery());
                }
                
                
    
                if($package->getNumRows()>0 && $coupon->getNumRows()>0){
                    $course_price = $package->getRowArray();
                    $coupon_price = $coupon->getRowArray();
                    
                    $coupon_applied_count_total = $this->get_coupon_applied_count($coupon_price['id']) ?? 0;
                    $coupon_applied_count_user = $this->get_coupon_applied_count($coupon_price['id'], $user_id) ?? 0;
                    if($coupon_applied_count_total < $coupon_price['total_no'] && $coupon_applied_count_user < $coupon_price['per_user_no']){
                    
                        if($coupon_price['discount_perc']==100){
                            $package_data = $package->getRow();
                            log_message('error',print_r($package_data,true));
                            $package_duration = $package_data->duration ?? 10;
                            $expiry_date = date('Y-m-d', strtotime(date('Y-m-d'). " + {$package_duration} days"));
                            $query = $this->db->table('users')
                                     ->select('*')
                                     ->where('users.id', $user_id);
                            $student = $query->get()->getRow();
                            $account_id = $this->get_primary_account_id();
                            
                            $data['user_id'] = $user_id;
                            $data['package_id'] = $package_id;
                            $data['account_id'] = $account_id;
                            $data['amount_paid'] = 0;
                            $data['coupon_id'] = $coupon_price['id'];
                            $data['discount'] = $course_price['discount'];
                            $data['razorpay_payment_id'] = '';
                            $data['user_phone'] =  $student->phone;
                            $data['user_email'] =  $student->user_email;
                            $data['payment_date'] = date('Y-m-d H:i:s');
                            $data['package_duration'] = $package_duration;
                            $data['expiry_date'] = $expiry_date;
                            $data['created_at'] = date('Y-m-d H:i:s');
                            $data['updated_at'] = date('Y-m-d H:i:s');
                            $data['created_by'] = $user_id;
                            $data['updated_by'] = $user_id;
                            $data['code'] = $coupon_price['code']."[".$coupon_price['discount_perc']."%]";
                            $this->payments_model->add($data);
                             
                            $course_id = $course_price['course_id'];
                            if($course_id>0) { 
                                $enrol_course_id = $course_id;
                            }else{
                                $course = $this->db->get_where('package',['id' => $package_id])->row()->course_id;
                                $enrol_course_id = $course;
                            } 
                            $this->enrol_model->enrol_course($user_id, $enrol_course_id, $package_id);
                            
                            $user_data['course_id'] = $enrol_course_id;
                            $this->users_model->edit($user_data, ['id' => $user_id]);
                            
                            $response['is_free'] = 1;
                            $response['offer_price'] = $course_price['amount'] - $course_price['discount'];
                            $response['valid'] = 1;
                            $response['message'] = 'Coupon code applied successfully!';
                                
                        }else{
                            $coupon_applied_count_total = $this->get_coupon_applied_count($coupon_price['id']) ?? 0;
                            $coupon_applied_count_user = $this->get_coupon_applied_count($coupon_price['id'], $user_id) ?? 0;
            
                            if($coupon_applied_count_total < $coupon_price['total_no'] && $coupon_applied_count_user < $coupon_price['per_user_no']){
                                $price = $course_price['amount'] - $course_price['discount'];
                                $response['price']     = $price;
                                $response['coupon_id'] = $coupon_price['id'];
                                $response['discount_applied'] = $coupon_price['discount_perc'];
                                $response['offer_price'] = $price - ceil(($price * (int)$coupon_price['discount_perc'])/100);
                                
                                $response['is_free'] = 0;
                                $response['valid'] = 1;
                                $response['message'] = 'Coupon code applied successfully!';
                            }else{
                                $response['is_free'] = 0;
                                $response['valid'] = 0;
                                $response['message'] = 'Coupon Code Expired!';
                            }
        
                        }
                    }else{
                        $response['is_free'] = 0;
                        $response['valid'] = 0;
                        $response['message'] = 'Coupon Code Expired!';
                    }
    
                }else{
                    $response['is_free'] = 0;
                    $response['valid'] = 0;
                    $response['message'] = 'Invalid Coupon Code!';
                }
            }else{
                $response['is_free'] = 0;
                $response['valid'] = 0;
                $response['message'] = 'Invalid Coupon Code!';
            }
		return $response;
	}
	
	public function get_coupon_applied_count($coupon_id, $user_id = 0){
	    $query = $this->db->table('payment_info')
	             ->select('count(coupon_id) as applied_count')
	             ->where('coupon_id', $coupon_id);
                    if($user_id > 0){
                        $query->where('user_id', $user_id);
                    }
        $count = $query->get();
                
        return $count->getRow()->applied_count;
    }
    
    public function get_primary_account_id()
    {
        $query = $this->db->table('accounts')
                 ->select('*')
                 ->where('accounts.is_primary',1);
                 
        $account = $query->get()->getRow();
        return $account->id;
    }
    

}
