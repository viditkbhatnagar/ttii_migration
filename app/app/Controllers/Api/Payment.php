<?php
//File: app/Controllers/Api/Home.php

namespace App\Controllers\Api;

use App\Controllers\Api\Api;
use App\Models\Course_model;
use App\Models\Payment_model;
use App\Models\Users_model;
use App\Models\Enrol_model;
use App\Models\Package_model;
use App\Models\Subject_package_model;
use App\Models\Coupon_code_model;

class Payment extends Api
{
    private $users_model;
    public function __construct(){
        $this->course_model      = new Course_model();
        $this->users_model       = new Users_model();
        $this->enrol_model       = new Enrol_model();
        $this->payment_model     = new Payment_model();
        $this->package_model     = new Package_model();
        $this->subject_package_model= new Subject_package_model();
        $this->coupon_code_model= new Coupon_code_model();
    }
    
    public function generate_payment() {
        $this->is_valid_request(['GET']);
        
        $package_id = $this->request->getGet('package_id');
        $package = $this->package_model->get(['id' => $package_id])->getRow();
        
        $userdata = $this->users_model->get(['id' => $this->user_id])->getRow();
        $email = $userdata->user_email ?? 'php.trogon@gmail.com';
        $subjects_id = $this->request->getGet('subjects');
        
        $currentDate = new \DateTime();
        $duration = $package->duration ?? 30 ;

        // Add the duration to the current date
        $currentDate->add(new \DateInterval('P' . $duration . 'D'));
        
        // Get the expiry date
        $expiry_date = $currentDate->format('Y-m-d');
        
        if(!is_array($subjects_id)) {
            $subjects = json_decode($subjects_id); // Convert comma-separated string to array
            // $subjects = explode(',', $subjects_id); // Convert comma-separated string to array
            // $subjects = array_map('intval', $subjects); // Convert values to integers if needed
        }
        
        if(!empty($subjects)) {
            
            // Fetch package details with subjects filtered by subject IDs
            $subject_package = $this->subject_package_model->get(['package_id' => $package_id])->getResultArray();
            // print_r($subject_package);die();
            $total_amount = 0;
            if (!empty($subject_package)) {
                foreach ($subject_package as $subject) {
                    if (in_array($subject['id'], $subjects)) {
                        // Assuming there's 'amount' and 'discount' columns in your database table for subjects
                        $total_amount += ($subject['amount'] - $subject['discount']);
                    }
                }
            }
            $amount = $total_amount;
        } else {
            $amount = $package->amount - $package->discount;
        }
        
        // // Convert $subjects array to string
        // $subjectsString = implode(',', $subjects); // Convert array back to comma-separated string
        
        // Construct the data URL with all parameters
        $data = 'https://project.trogon.info/easebuzz/index.php'
                . '?package_id=' . $package_id
                . '&package_name=' . urlencode($package->title)
                . '&user_id=' . $this->user_id
                . '&course_id=' . $package->course_id
                . '&name=' . urlencode($userdata->name)
                . '&phone=' . urlencode($userdata->phone)
                . '&email=' . urlencode($email)
                . '&amount=' . $amount
                . '&subjects=' . $subjects_id
                . '&platform=app'
                . '&expiry_date=' . $expiry_date;
        
        $this->response_data = ['status' => 1, 'message' => 'Successfully', 'data' => $data];
        
        
        
        return $this->set_response();
    }

    
    public function create_order(){
        
        $this->is_valid_request(['GET']);
        
        $user_id = $this->user_id;
        $course_id = $this->request->getGet('course_id');
        $receipt = $this->request->getGet('receipt') ?? 'receipt_' . time();
        $currency = $this->request->getGet('currency') ?? 'INR';
        
        // Validate course_id

        if(!$course_id) {
            $this->response_data = ['status' => 0, 'message' => 'Course ID is required'];
            return $this->set_response();
        }

        try{
            $data = $this->payment_model->create_order($user_id, $course_id,$receipt,$currency);
            $this->response_data = ['status' => 1, 'message' => 'Order created successfully', 'data' => $data];
            return $this->set_response();
        }
        catch (\Throwable $e) {
            log_message('error', 'createOrder error: '.$e->getMessage());
            $this->response_data=[
                'status' => 0,
                'message' => 'Failed to create order: ' . $e->getMessage(),
                'data' => []
            ];
            return $this->set_response();

        }
        
    }
    
    // complete order
    public function complete_order(){
        $this->is_valid_request(['GET']);
        
        $course_id = $this->request->getGet('course_id');
        $razorpay_order_id = $this->request->getGet('razorpay_order_id');
        $razorpay_payment_id = $this->request->getGet('razorpay_payment_id');
        $razorpay_signature = $this->request->getGet('razorpay_signature');

        if (
            empty($course_id) ||
            empty($razorpay_order_id) ||
            empty($razorpay_payment_id) ||
            empty($razorpay_signature)
        ) {
            // One or more parameters missing
            return $this->response->setJSON([
                'status'  => 'error',
                'message' => 'Missing required parameters: course_id or razorpay_order_id or razorpay_payment_id or razorpay_signature'
            ]);
        }
        //$is_upgrade = $this->request->getGet('is_upgrade');
        //$coupon_id = $this->request->getGet('coupon_id');
        
        try {
            $completed = $this->payment_model->complete_order(
                $this->user_id,
                $course_id,
                $razorpay_order_id,
                $razorpay_payment_id,
                $razorpay_signature
            );

            if (!$completed) {
                $this->response_data = ['status' => 0, 'message' => 'Payment already processed or invalid.', 'data' => []];
                return $this->set_response();
            }

            $this->response_data = ['status' => 1, 'message' => 'Payment success!', 'data' => []];
            return $this->set_response();
        } catch (\Throwable $e) {
            log_message('error', 'complete_order error: ' . $e->getMessage());
            $this->response_data = ['status' => 0, 'message' => 'Payment verification failed.', 'data' => []];
            return $this->set_response();
        }
    }
    
    public function apply_coupon() {
        $this->is_valid_request(['GET']);
        
        $auth_token     = $this->request->getGet('auth_token');
        $course_id      = $this->request->getGet('course_id');
        $package_id     = $this->request->getGet('package_id');
        $coupon_code    = $this->request->getGet('coupon_code');
        
        $response = $this->coupon_code_model->plans_by_coupon_get($course_id,$this->user_id,$package_id,$coupon_code);
        $response['status'] = 'success';
        $this->response_data = $response;
        return $this->set_response();
    }   

    public function get_student_courses(){
        $this->is_valid_request(['GET']);

        $data = $this->enrol_model->get_enroled_courses($this->user_id);

        foreach ($data as $key =>  $d){
            $installments = $this->enrol_model->get_payment_details($this->user_id, $d['course_id']);
            $total_fee = $this->course_model->get(['id' => $d['course_id']])->getRow()->total_amount;

            /////////////////////////////////////////
            $discount_percentage = $this->enrol_model->get(['user_id' => $this->user_id, 'course_id' => $d['course_id']])->getRow()->discount_perc;
            $discount = !empty($discount_percentage) ? (float)$discount_percentage : 0;

            // apply discount
            $discounted_price = $total_fee - ($total_fee * ($discount / 100));

            ///////////////////////////////////////////////////////



            $data[$key]['total_fee'] = $discounted_price;   //total_fee
            $data[$key]['installments'] = $installments;
            
            // Calculate amount paid (sum of paid installments)
            $amount_paid = 0;
            $has_pending_overdue = false;
            $current_date = date('Y-m-d');
            
            foreach ($installments as $installment) {
                if ($installment['status'] === 'Paid') {
                    $amount_paid += floatval($installment['amount']);
                }
                
                // Check for overdue installments
                if ($installment['status'] === 'Pending' && $installment['due_date'] < $current_date) {
                    $has_pending_overdue = true;
                }
            }
            
            // Calculate balance
            $balance = $total_fee - $amount_paid;
            
            // Calculate payment percentage
            $payment_percentage = $total_fee > 0 ? round(($amount_paid / $total_fee) * 100, 2) : 0;
            
            // Determine status
            $status = 'completed';
            if ($balance > 0) {
                $status = $has_pending_overdue ? 'Overdue' : 'Pending';
            }
            
            $data[$key]['amount_paid'] = $amount_paid;
            $data[$key]['balance'] = $balance;
            $data[$key]['payment_percentage'] = $payment_percentage;
            $data[$key]['status'] = $status;
        }

        $this->response_data = ['status' => 1, 'message' => 'Payment success!', 'data' => $data];
        return $this->set_response();
    
    }

    public function get_payment_details(){
        $this->is_valid_request(['GET']);

        $course_id = $this->request->getGet('course_id');
        $data = [];
        $data['total_fee'] = '';
        $data['amount_paid'] = '';
        $data['balance'] = '';
        $data['payment_percentage'] = '';
        $data['installments'] = $this->enrol_model->get_payment_details($this->user_id, $course_id);

        $this->response_data = ['status' => 1, 'message' => 'Payment success!', 'data' => $data];
        return $this->set_response();
    }
    
}
