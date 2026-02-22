<?php
namespace App\Controllers\Admin;
use App\Models\Batch_model;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Package_model;
use App\Models\Coupon_code_model;
use App\Models\Payment_model;
use App\Models\Enrol_model;

class Payments extends AppBaseController
{
    private $batch_model;
    private $course_model;
    private $users_model;


    public function __construct()
    {
        parent::__construct();
        $this->batch_model = new Batch_model();
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->package_model = new Package_model();
        $this->coupon_code_model = new Coupon_code_model();
        $this->payment_model = new Payment_model();
        $this->enrol_model = new Enrol_model();
    }

    public function index(){
        
        // $this->data['list_items'] = $this->payment_model->get_join(
        //                                 [
        //                                     ['users','users.id = payment_info.user_id'],
        //                                     ['package','package.id = payment_info.package_id']
        //                                 ],[],
        //                                 ['users.name','package.title','package.end_date','payment_info.*']
        //                                 )->getResultArray();
        
        
        $this->data['list_items'] = $this->payment_model->payment_list();
        
        $this->data['page_title'] = 'Payments';
        $this->data['page_name'] = 'Payments/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add(){
        $this->data['courses']   = $this->course_model->get()->getResultArray();
        $this->data['students'] = $this->users_model->get(['role_id' => 2])->getResultArray();
        echo view('Admin/Payments/ajax_add', $this->data);
    }

    public function add(){
        if ($this->request->getMethod() === 'post'){
            $user_id = $this->request->getPost('user_id');
            $student = $this->users_model->get(['id'=>$user_id])->getRow();
            $course_id = $this->request->getPost('course_id');
            // $account_id = $this->accounts_m->get_primary_account_id();
            
            // get package details
            // $package = $this->package_model->get(['id' => $this->request->getPost('package_id')])->getRow();
            // $package_duration = $package->duration ?? 100;
            // $expiry_date = date('Y-m-d', strtotime(date('Y-m-d'). " + {$package_duration} days"));
            
            $data['user_id']            = $user_id;
            // $data['package_id']         = $this->request->getPost('package_id');
            $data['course_id']         = $course_id;
        //  $data['account_id']         = $account_id;
            $data['amount_paid']        = $this->request->getPost('amount_paid');
            $data['coupon_id']          = $this->request->getPost('coupon_id') ?? 0;
            $data['discount']           = $this->request->getPost('discount');
            $data['razorpay_payment_id'] = $this->request->getPost('razorpay_payment_id');
            $data['user_phone']         =  $student->phone;
            $data['user_email']         =  $student->user_email;
            $data['payment_date']       = date('Y-m-d H:i:s');
            //$data['package_duration']   = $package_duration;
            //$data['expiry_date']        = $expiry_date;
            $data['created_at']         = date('Y-m-d H:i:s');
            $data['created_by']         = get_user_id();
            $data['note']               = $this->request->getPost('note');
            
            if($this->request->getPost('coupon_id')>0){
    		    $coupon = $this->coupon_code_model->get(['id' => $data['coupon_id']])->getRow();
                $data['code'] = $coupon->code."[".$coupon->discount_perc."%]";
    		}
            
            $id = $this->payment_model->add($data);
            
            $enrol = $this->enrol_model->get(['user_id' => $user_id,'course_id' => $course_id]);
            
            if ($enrol->getNumRows() > 0) {
                //update
                $this->enrol_model->edit([
                    'user_id' => $user_id,
                    'course_id' => $course_id,
                    //'package_id' => $package->id,
                    'premium' => 0,
                    'updated_at' => date('Y-m-d H:i:s')],['id' => $enrol->getRow()->id]);
            }else{
                // insert
                $this->enrol_model->add([
                    'user_id' => $user_id,
                    'course_id' => $course_id,
                    'enrollment_date'=> date('Y-m-d'),
                    'enrollment_status' => 'Active',
                    'mode_of_study' => 'Online',
                    'preferred_language' => 2,
                    //'package_id' => $package->id,
                    'premium' => 0,
                    'created_by' =>get_user_id(),
                    'created_at' => date('Y-m-d H:i:s'),
                ]);
            }
            
            
            session()->setFlashdata('message_success', "Added Successfully!");
        }
        return redirect()->to(base_url('admin/payments/index'));
    }



    public function ajax_view($id){
        $this->data['course'] = $this->course_model->get_array_column([], 'id', 'title');
        $this->data['view_data'] = $this->batch_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Batch/ajax_view', $this->data);
    }
    
    public function extend_package_submit($payment_id = null){
        if ($payment_id > 0){
            $payment['expiry_date'] = $this->request->getPost('expiry_date');
            $payment['is_extended'] = 1;
            $this->payment_model->edit($payment, ['id' => $payment_id]);
            session()->setFlashdata('message_success', "Updated Successfully!");
            return redirect()->to(base_url('admin/payments/index'));
        }

    }
    public function print_payment($payment_id)
	{
		if($payment_id) {
// 			$order_data = $this->payment_model->get_join(
//                                         [
//                                             ['users','users.id = payment_info.user_id'],
//                                             ['package','package.id = payment_info.package_id'],
//                                             ['course','course.id = package.course_id']
//                                         ],['payment_info.id' => $payment_id],
//                                         ['users.name','users.phone','package.title','course.title as course_name','payment_info.*']
//                                         )->getRowArray();
            
                                        
            $order_data = $this->payment_model->getPaymentInfo($payment_id);
            
          
            
			$order_date = date('d/m/Y h:i A', strtotime($order_data['payment_date']));

			$html = '<!-- Main content -->
			<!DOCTYPE html>
			<html>
                <head>
                    <meta charset="utf-8">
                    <meta http-equiv="X-UA-Compatible" content="IE=edge">
                    <title>Invoice</title>
                    <link rel="shortcut icon" href="'.get_image_url(20).'">
                    <!-- Tell the browser to be responsive to screen width -->
                    <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" name="viewport">
                    <!-- Bootstrap 3.3.7 -->
                    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
                    <!-- Font Awesome -->
                    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css">
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/admin-lte/3.0.5/css/adminlte.min.css">
                </head>
                <body onload="window.print();">
                    <div class="wrapper">
                    <section class="invoice container" style="margin-top:100px;">
                        <!-- title row -->
                        <div class="row">
                        <div class="col-md-12 col-xs-12 col-sm-12 col-xl-12">
                        <h2 class="page-header">
                        TTII
                        <span class="pull-right" style="font-size:20px;">Date: '.$order_date.'</span>
                        </h2>
                        </div>
                        <!-- /.col -->
                        </div>
                        <!-- info row -->
                        <div class="row invoice-info">
                        
                        <div class="col-sm-4 invoice-col">
                        
                        <b>Invoice No:</b> '.$order_data['razorpay_payment_id'].'<br>
                        <b>Name:</b> '.strtoupper($order_data['name']).'<br>
                        <b>Phone:</b> '.$order_data['phone'].'
                        </div>
                        <!-- /.col -->
                        </div>
                        <!-- /.row -->
                        
                        <!-- Table row -->
                        <div class="row">
                            <div class="col-xs-12 table-responsive">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>Course name</th>
                                            <th>Price</th>
                                            <th>Discount</th>
                                            <th>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>'; 
                                    
                                    
                                    
                                    $html .= '<tr>
                                        <td>'.$order_data['course_name'].'</td>
                                        <td>'.($order_data['amount_paid']+$order_data['discount']).'</td>
                                        <td>'.$order_data['discount'].'</td>
                                        <td>'.$order_data['amount_paid'].'</td>
                                    </tr>';
                                    
                                    
                                    $html .= '</tbody>
                                    <tfoot>
                                        <tr>
                                            <th></th>
                                            <td></td>
                                            <th>Total Amount:</th>
                                            <th><i class="fa fa-rupee"></i> '.$order_data['amount_paid'].'</th>
                                        </tr>
                                        <tr>
                                            <th></th>
                                            <td style="padding-top:20px">(office seal)</td>
                                            <th></th>
                                            <th></th>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        <!-- /.col -->
                        </div>
                        <!-- /.row -->

                    </section>
                    <!-- /.content -->
                    </div>
                </body>
                </html>';

			  echo $html;
		}
	}
    public function extend_package($payment_id){
        $this->data['payment_id'] = $payment_id;
        echo view('Admin/Payments/extend_package', $this->data);
    }


    public function delete($id){
        if ($id > 0){
            if ($this->payment_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/payments/index'));
    }
    
    
    

    public function ajax_get_package_by_id($package_id) {
        echo json_encode($this->package_model->get(['id' => $package_id])->getRow());
    }

     public function ajax_get_course_by_id($course_id) {
        echo json_encode($this->course_model->get(['id' => $course_id])->getRow());
    }
    
    public function ajax_get_coupons() {
        $package_id = $this->request->getPost('package_id');
        $user_id = $this->request->getPost('user_id');
        $coupons = $this->coupon_code_model->get(['package_id' => $package_id, 'user_id' => $user_id])->getResultArray();
        // log_message('error', '$coupons ' . print_r($coupons, true));
        // log_message('error', '$_POST ' . print_r($_POST, true));
        $i = 1;
        $options = '<option value="0">Select Coupon (if applicable)</option>';
        if (count($coupons) > 0) {
            foreach ($coupons as $code) {
                $uid = "";
                if ($code['user_id'] > 0) {
                    $stud = $this->users_model->get(['id' => $code['user_id']])->getRowArray();
                    $uid = '-' . strtoupper($stud['name']) . ' ( ' . $stud['phone'] . ' )';
                }
                $options .= "<option value='" . $code['id'] . "'>" . $code['code'] . " (" . $code['discount_perc'] . "%) " . $uid . "</option>";
            }
        }
        echo $options;
    }


    function apply_coupon_by_id($coupon_id){
        $coupon=    $this->coupon_code_model->get(['id' => $coupon_id]);
        echo json_encode($coupon->getRow());
    }

    
}
