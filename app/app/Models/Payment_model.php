<?php namespace App\Models;

use CodeIgniter\Model;

use Razorpay\Api\Api;
use Razorpay\Api\Errors\SignatureVerificationError;

use App\Models\Users_model;
use App\Models\Course_model;
use App\Models\Package_model;
use App\Models\Accounts_model;
use App\Models\Create_order_model;
use App\Models\Subject_package_model;

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
    
    public function payment_list()
    {
         return $this->db->table($this->table)
            ->select('users.name, course.title, payment_info.*')
            ->join('users', 'users.id = payment_info.user_id')
            ->join('course', 'course.id = payment_info.course_id')
            ->where('payment_info.deleted_at', null)
            ->orderBy('payment_info.id','desc')
            ->get()
            ->getResultArray();
    }
    
    
    public function getPaymentInfo($id)
    {
        return $this->db->table($this->table)
            ->select('users.name, users.phone,course.title as course_name, payment_info.*')
            ->join('users', 'users.id = payment_info.user_id', 'left')
            ->join('course', 'course.id = payment_info.course_id', 'left')
            ->where('payment_info.id', $id)
            // ->where('payment_info.deleted_at IS NULL')
            // ->where('users.deleted_at IS NULL')
            // ->where('package.deleted_at IS NULL')
            // ->where('course.deleted_at IS NULL')
            ->get()
            ->getRowArray();
    }
     
    
    public function user_purchase_status($user_id, $course_id, $subject_id = 0) {
        $logger = service('logger');
        $this->users_model = new Users_model();
        $this->course_model = new Course_model();
        $this->package_model = new Package_model();
        $this->subject_package_model = new Subject_package_model(); // Add this line
        $this->payments_model = new Payments_model(); // Add this line
        $logger = service('logger');
        
        $free = 'off';
        $user_data = $this->users_model->get(['id' => $user_id])->getRow();
        $premium = $user_data->premium ?? 0;
        $role_id = $user_data->role_id ?? 0;
        
        if($role_id == 3) {
            $free = 'on';
        } else {
            if ($premium == 1) {
                $free = 'on';
            } else {
                $course_details = $this->course_model->get(['id' => $course_id])->getRow();
                $logger = service('logger');
                
                if (!empty($course_details)) {
                    if($course_details->is_free_course != 1) {
                        $packages = $this->package_model->get(['course_id' => $course_id])->getResultArray();
                        if (!empty($packages)) {
                            $current_date = date('Y-m-d');
     
                            foreach($packages as $package) {
                                $package_id = $package['id'];
    
                                // Fetch payment information for the package
                                $payments = $this->get(['package_id' => $package_id, 'user_id' => $user_id])->getResultArray();
                                if (!empty($payments)) {
                                    foreach ($payments as $payment) {
                                        $expire_date = $payment['expiry_date'] ?? '';
                                        if ($expire_date != '' && $expire_date >= $current_date) {
                                            $free = 'on';
                                            break 2; // Break out of both loops if package type is 3
                                        }
                                    }
                                }
                            }
                        }
                    }else {
                        $free = 'on';
                    }
                }
            }
        }
        return $free;
    }


    
    public function create_order($user_id,$course_id,$receipt,$currency): array {
        $api = new Api(get_settings('razorpay_api_key'), get_settings('razorpay_api_secret_key'));
        $this->course_model = new Course_model();
        
        $course = $this->course_model->get(['id' => $course_id],[],null,null)->getRow();
        if (!$course) {
            logger()->error('Course not found for ID: ' . $course_id);
            throw new \Exception('Course not found');
        }
        $amount = $course->sale_price * 100; // Convert to paise
        
        $response = $api->order->create([
             'receipt'     => $receipt,
             'amount'      => $amount,
             'currency'    => $currency,
              'notes'      => [
                    'user_id'   => (string)$user_id,
                    'course_id' => (string)$course_id
                ],
        ]);
         


        $return['id']             = $response['id'];
        $return['entity']         = $response['entity'];
        $return['amount']         = $response['amount'];
        $return['amount_paid']    = $response['amount_paid'];
        $return['amount_due']     = $response['amount_due'];
        $return['currency']       = $response['currency'];
        $return['receipt']        = $response['receipt'];
        $return['offer_id']       = $response['offer_id'];
        $return['status']         = $response['status'];
        $return['attempts']       = $response['attempts'];
        $return['notes']          = $response['notes'];

        //save order
       // $order_save['package_id']   = $package_id;
        $order_save['order_id']     = $response['id'];
        $order_save['amount']       = $amount/100;
        $order_save['user_id']      = $user_id;
        $order_save['course_id']    = $course_id;
        // $order_save['coupon_id']    = $this->request->getGet('coupon_id');
        //$order_save['coupon_id']    = $coupon_id;
        $order_save['order_status'] = 'pending';
        $order_save['notes'] = json_encode($response['notes'] ?? []);
        $order_save['created_by']   = $user_id;
        $order_save['created_at']   = date('Y-m-d H:i:s');
        $order_save['datetime']     = date('Y-m-d H:i:s');
        
        $builder = $this->db->table('create_order');
        $order_id = $builder->insert($order_save);


        $data = ['order_id' => $response['id'],
                'amount'   => $response['amount'],
                'currency' => $response['currency'],
                'key'      => get_settings('razorpay_api_key'),
        ];
        return $data;

    }
    
    public function complete_order($user_id, $course_id, $razorpay_order_id, $razorpay_payment_id, $razorpay_signature): bool {
        helper('payment_security');
        
        $logger = service('logger');
        $this->users_model = new Users_model();
        $this->course_model = new Course_model();
        $this->create_order_model = new Create_order_model();
        $this->payments_model = new Payments_model();
        $this->enrol_model = new Enrol_model();

        $course = $this->course_model->get(['id' =>$course_id])->getRow();
        $order_details = $this->create_order_model->get(['order_id' => $razorpay_order_id])->getRow();
        $user = $this->users_model->get(['id' => $user_id])->getRow();
        // $logger->error('subject order Error: ' . db_connect()->getLastQuery());

        if (!$course || !$order_details || !$user) {
            throw new \RuntimeException('Unable to verify payment context');
        }

        if (!is_valid_order_binding($order_details, (int) $user_id, (int) $course_id)) {
            $logger->warning('Payment order binding mismatch for order_id: ' . $razorpay_order_id);
            throw new \RuntimeException('Payment order verification failed');
        }
        
        
        $amount_paid = $course->sale_price;
        //$discount = $package->discount;
        $amount_paid    = $order_details->amount;
        // $amount_paid    = $amount_paid/118*100;

        //$package_duration = $package->duration ?? 100;
        //$expiry_date = date('Y-m-d', strtotime(date('Y-m-d'). " + {$package_duration} days"));

        $data = array(
            //'account_id'            => $account_id,
            'user_id'               => $user_id,
            //'package_id'            => $package->id,
            'amount_paid'           => $amount_paid,
            //'discount'              => $discount,
            'coupon_id'             => $coupon_id ?? 0,
            'course_id'             => $course_id,
            'razorpay_payment_id'   => $razorpay_payment_id,
            'user_phone'            => $user->phone,
            'user_email'            => $user->user_email ?? "",
            'razorpay_order_id'     => $razorpay_order_id,
            'razorpay_signature'    => $razorpay_signature,
            //'is_upgrade'            => 0,
            'payment_date'          => date('Y-m-d H:i:s'),
            //'package_duration'      => $package_duration,
            //'expiry_date'           => $expiry_date,
            'created_at'            => date('Y-m-d H:i:s'),
            'updated_at'            => date('Y-m-d H:i:s'),
            'created_by'            => $user_id,
            'updated_by'            => $user_id,
        );

        $this->verify_payment_signature($razorpay_signature, $razorpay_payment_id, $razorpay_order_id);

        $check_payment = $this->payments_model->get(['razorpay_payment_id' => $razorpay_payment_id]);
        
        if ($check_payment->getNumRows() > 0) {
            return false;
        }else{
            $this->payments_model->add($data);
        }
        $this->create_order_model->edit(['order_status' => 'completed','payment_id_raz' => $razorpay_payment_id], ['order_id' => $razorpay_order_id]);
        $this->enrol_model->enrol_course($user_id, $course_id, null);
        return true;
    }
    
    // verify payment signature
    public function verify_payment_signature($razorpay_signature, $razorpay_payment_id, $razorpay_order_id){
        $api = new Api(get_settings('razorpay_api_key'), get_settings('razorpay_api_secret_key'));
        $attributes  = [
            'razorpay_signature'      => $razorpay_signature,
            'razorpay_payment_id'     => $razorpay_payment_id ,
            'razorpay_order_id'       => $razorpay_order_id
        ];
        $order  = $api->utility->verifyPaymentSignature($attributes);
    }


}
