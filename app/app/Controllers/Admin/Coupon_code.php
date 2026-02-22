<?php
namespace App\Controllers\Admin;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Coupon_code_model;
use App\Models\Package_model;

class Coupon_code extends AppBaseController
{
    private $batch_model;
    private $course_model;
    private $users_model;


    public function __construct()
    {
        parent::__construct();
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->coupon_code_model = new Coupon_code_model();
        $this->package_model = new Package_model();
    }

    public function index(){
        
        // $this->data['list_items'] = $this->coupon_code_model->get()->getResultArray();
        $this->data['list_items'] = $this->coupon_code_model->get_join(
            [
                ['users', 'users.id = coupon_code.user_id'],
                ['package','package.id = coupon_code.package_id']
                ],
                [],
                ['coupon_code.*','users.name as name','package.title as package']
            )->getResultArray();
        // $packages   = $this->package_model->get()->getResultArray();
        // $this->data['package'] = array_column($packages,'title','id');
        // $users   = $this->users_model->get()->getResultArray();
        // $this->data['user'] = array_column($users,'name','id');
        
        $this->data['page_title'] = 'Coupon Code';
        $this->data['page_name'] = 'Coupon_code/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add(){
        $this->data['packages']   = $this->package_model->get()->getResultArray();
        $this->data['users']   = $this->users_model->get(['role_id' => 2])->getResultArray();
        echo view('Admin/Coupon_code/ajax_add', $this->data);
    }

    public function add(){
        if ($this->request->getMethod() === 'post'){
            $data = [
                'package_id'        => $this->request->getPost('package_id'),
                'user_id'           => $this->request->getPost('user_id'),
                'discount_perc'     => $this->request->getPost('discount_perc'),
                'code'              => $this->request->getPost('code'),
                'total_no'          => $this->request->getPost('total_no'),
                'per_user_no'       => $this->request->getPost('per_user_no'),
                'end_date'          => $this->request->getPost('end_date'),
                'start_date'        => $this->request->getPost('start_date'),
                'created_by'        => get_user_id(),
                'created_at'        => date('Y-m-d H:i:s'),
            ];
            
            if($data['package_id']==0){
                $package = $this->package_model->get(['id'=> $data['package_id']])->getRow();
                $data['package']    = '';
                $data['amount']     = 0;
            }else{
                $package = $this->package_model->get(['id'=> $data['package_id']])->getRow();
                $data['package']    = $package->description;
                $data['amount']     = $package->amount-$package->discount;
            }    
            
            $inserted_id = $this->coupon_code_model->add($data);
            if ($inserted_id){
                session()->setFlashdata('message_success', "Added Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/Coupon_code/index'));
    }

    public function ajax_edit($id){ 
        $this->data['packages']   = $this->package_model->get()->getResultArray();
        $this->data['users']   = $this->users_model->get(['role_id' => 2])->getResultArray();
        $this->data['edit_data'] = $this->coupon_code_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Coupon_code/ajax_edit', $this->data);
    }

    public function edit($id){
        if ($this->request->getMethod() === 'post'){
            $data = [
                'package_id'        => $this->request->getPost('package_id'),
                'user_id'           => $this->request->getPost('user_id'),
                'discount_perc'     => $this->request->getPost('discount_perc'),
                'code'              => $this->request->getPost('code'),
                'total_no'          => $this->request->getPost('total_no'),
                'per_user_no'       => $this->request->getPost('per_user_no'),
                'end_date'          => $this->request->getPost('end_date'),
                'start_date'        => $this->request->getPost('start_date'),
                'updated_by'        => get_user_id(),
                'updated_at'        => date('Y-m-d H:i:s'),
            ];
            
            $response = $this->coupon_code_model->edit($data, ['id' => $id]);
            if ($response){
                session()->setFlashdata('message_success', "Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/coupon_code/index'));
    }

    public function ajax_view($id){
        $this->data['course'] = $this->course_model->get_array_column([], 'id', 'title');
        $this->data['view_data'] = $this->feed_category_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Batch/ajax_view', $this->data);
    }

    public function delete($id){
        if ($id > 0){
            if ($this->coupon_code_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/coupon_code/index'));
    }
    
    public function get_validty_check(){
        
        $coupon_id = $this->request->getPost('coupon_id');
        $if_taken = $this->coupon_code_model->get(['id' => $coupon_id])->getRow();
        log_message('error','$if_taken '.print_r($if_taken,true));
        if($if_taken->validity==0){
            $data['validity'] = 1;
            $response = $this->coupon_code_model->edit($data, ['id' => $coupon_id]);
        }else{
            $data['validity'] = 0;
            $response = $this->coupon_code_model->edit($data, ['id' => $coupon_id]);
        }
        
    }
    
    

}
