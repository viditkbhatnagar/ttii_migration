<?php
namespace App\Controllers\Centre;

use App\Models\Users_model;

use App\Models\Payment_model;


use App\Models\Wallet_transactions_model;
use App\Models\Centres_model;
use App\Models\Centre_fundrequests_model;
use Dompdf\Dompdf;
use Dompdf\Options;

class Wallet extends CentreBaseController
{
    
    private $users_model;
    private $centres_model;
    
    private $payment_model;
    private $wallet_transactions_model;
    private $centre_fundrequests_model;


    public function __construct()
    {
        parent::__construct();
        
        $this->users_model = new Users_model();
       
        $this->payment_model = new Payment_model();
       
        $this->wallet_transactions_model = new Wallet_transactions_model();
        $this->centres_model = new Centres_model();
        $this->centre_fundrequests_model = new Centre_fundrequests_model();
    }

    // public function index(){
        
    //     // $this->data['list_items'] = $this->payment_model->get_join(
    //     //                                 [
    //     //                                     ['users','users.id = payment_info.user_id'],
    //     //                                     ['package','package.id = payment_info.package_id']
    //     //                                 ],[],
    //     //                                 ['users.name','package.title','package.end_date','payment_info.*']
    //     //                                 )->getResultArray();
        
        
    //     $this->data['list_items'] = $this->payment_model->payment_list();
        
    //     $this->data['page_title'] = 'Payments';
    //     $this->data['page_name'] = 'Payments/index';
    //     return view('Admin/index', $this->data);
    // }
    
    public function index(){
        $user_id = get_user_id();
        $centre_id = $this->users_model->get(['id' => $user_id])->getRowArray()['centre_id'];
        $credit = 'credit';
        $debit = 'debit';

        $this->data['credits'] = $this->wallet_transactions_model->get(['transaction_type' => 'credit','centre_id' => $centre_id])->getResultArray();
        $this->data['debits'] = $this->wallet_transactions_model->get(['transaction_type' => 'debit','centre_id' => $centre_id])->getResultArray();

        $this->data['list_items'] = $this->centres_model->get(['id' => $centre_id])->getRowArray();

        $this->data['fund_requests'] = $this->centre_fundrequests_model->get(['centre_id' => $centre_id])->getResultArray();


        $this->data['page_title'] = 'Wallet Payments';
        $this->data['page_name'] = 'Wallet/index';
        return view('Centre/index', $this->data);
    }


    public function ajax_add_fund(){
        echo view('Centre/Wallet/ajax_add_fund');
    }

    public function add(){
        if ($this->request->getMethod() === 'post'){
            $user_id = get_user_id();
            $centre_id = $this->users_model->get(['id' => $user_id])->getRowArray()['centre_id'];

            $data['centre_id'] = $centre_id;
            $data['user_id'] = $user_id;
            $data['amount'] = $this->request->getPost('amount');
            $data['date'] = date('Y-m-d', strtotime($this->request->getPost('date')));
            $data['transaction_receipt'] = $this->request->getPost('transaction_no');
            $data['description'] = $this->request->getPost('description');
            $data['attachment_file'] = $this->request->getPost('uploadedFileName');
            $data['created_at'] = date('Y-m-d H:i:s');
            $data['created_by'] = $user_id;



            $this->centre_fundrequests_model->add($data);
            
            
            session()->setFlashdata('message_success', "Request Sent Sucessfully!");
        }
        return redirect()->to(base_url('centre/wallet/index'));
    }


    public function download_statement($centre_id)
    {
        $format = $this->request->getGet('format') ?? 'csv';

        // Fetch credit + debit transactions (same logic as your view)
         $credits= $this->wallet_transactions_model->get(['transaction_type' => 'credit','centre_id' => $centre_id])->getResultArray();
         $debits= $this->wallet_transactions_model->get(['transaction_type' => 'debit','centre_id' => $centre_id])->getResultArray();

        $all = [];
        foreach ($credits as $c) { $c['type'] = 'credit'; $all[] = $c; }
        foreach ($debits as $d) { $d['type'] = 'debit';  $all[] = $d; }

        usort($all, fn($a, $b) => strtotime($b['created_at']) - strtotime($a['created_at']));

        // Normalize for export
        $rows = [];
        foreach ($all as $r) {
            $rows[] = [
                'date' => date('d-m-Y H:i', strtotime($r['created_at'])),
                'transaction_id' => 'TXN-' . $r['id'],
                'type' => ucfirst($r['type']),
                'description' => $r['remarks'] ?? '',
                'amount' => number_format($r['amount'], 2)
            ];
        }

        /* ============================================================
        =============== CSV EXPORT (EASY) ===========================
        ============================================================ */
        if ($format === 'csv') {

            $filename = 'wallet_statement_' . date('Ymd_His') . '.csv';

            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="'.$filename.'"');
            header('Cache-Control: no-store, no-cache');

            $out = fopen('php://output', 'w');
            fputs($out, chr(0xEF) . chr(0xBB) . chr(0xBF)); // UTF-8 BOM for Excel

            fputcsv($out, ['Date','Transaction ID','Type','Description','Amount','Balance After']);
            foreach ($rows as $r) {
                fputcsv($out, $r);
            }

            fclose($out);
            exit;
        }

       /* ==============================================================
        PDF EXPORT (DOMPDF)
        ============================================================== */
        if ($format === 'pdf') {

            $html = view('Centre/Wallet/statement_pdf', [
                'rows'     => $rows,
                'centreId' => $centre_id
            ]);

            $options = new Options();
            $options->set('isHtml5ParserEnabled', true);
            $options->set('isRemoteEnabled', true);

            $dompdf = new Dompdf($options);
            $dompdf->loadHtml($html);
            $dompdf->setPaper('A4');

            $dompdf->render();

            $dompdf->stream('wallet_statement_' . date('Ymd_His') . '.pdf', [
                "Attachment" => true
            ]);

            exit;
        }


        return "Invalid Format";
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

    public function upload_attachment()
    {
        $response = []; // Initialize response array

        if ($this->request->isAJAX()) 
        {
            $attachment = $this->upload_file('centres', 'file');
            if($attachment){
                $response['filename'] = $attachment['file'];
            }
            else
            {
                $response['error'] = 'Failed to upload file.';
            }
            
        } else {
            // Handle non-AJAX request
            $response['error'] = 'Invalid request method.';
        }

        // Return JSON response
        return $this->response->setJSON($response);
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
            if ($this->payment_model->remov(['id' => $id])){
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
