<?php
namespace App\Controllers\Admin;

use App\Models\Student_fee_model;
use App\Models\Users_model;
use App\Models\Course_model;

use DateTime;

class Student_fee extends AppBaseController
{
    private $student_fee_model;
    private $users_model;
    private $course_model;

    public function __construct()
    {
        parent::__construct();
        $this->student_fee_model = new Student_fee_model();
        $this->users_model = new Users_model();
        $this->course_model = new Course_model();
    }
    
     public function add($id, $course_id = null) 
     {
        if ($this->request->getMethod() === 'post') 
        {
            $amount = $this->request->getPost('amount');
    
            // $total_course_amount = $this->users_model->get_join(
            //     [
            //         ['course', 'course.id = users.course_id'],
            //     ],
            //     ['users.id' => $id],
            //     ['course.total_amount']
            // )->getRowArray()['total_amount'];
    
            // $total_payment = array_sum(
            //     array_column(
            //         $this->student_fee_model->get(['user_id' => $id], ['amount'])->getResultArray(),
            //         'amount'
            //     )
            // );
            
    
            // if (($total_payment + $amount) > $total_course_amount) 
            // {
            //     session()->setFlashdata('message_danger', "Amount exceeds the total course amount.");
            // } 
            // else 
            // {
                $data = [
                    'installment_details' => $this->request->getPost('installment_details'),
                    'amount'              => $amount,
                    'due_date'            => $this->request->getPost('due_date'),
                    'payment_mode'        => $this->request->getPost('payment_mode'),
                    'paid_date'          => $this->request->getPost('payment_date'), 
                    'payment_to'          => $this->request->getPost('payment_to'),
                    'course_id'          => $this->request->getPost('course_id'),
                    'status'              => $this->request->getPost('status'),
                    'user_id'          => $id,
                    'created_at'          => date('Y-m-d H:i:s'),
                    'created_by'          => get_user_id(),
                ];
                
                          
    
                $result = $this->student_fee_model->add($data);
    
                if ($result) {
                    session()->setFlashdata('message_success', "Payment added successfully!");
                } else {
                    session()->setFlashdata('message_danger', "Something went wrong! Please try again.");
                }
            // }
    
            return redirect()->to(base_url('admin/students/edit/'.$id.'?active=4'));
        } else {
            $course_id;

            $this->data['id'] = $id;
            $this->data['course_id'] = $course_id;
            $this->data['student_id'] = $id;

            $this->data['courses'] = $this->course_model->get_join(
            [['enrol', 'enrol.course_id = course.id']],['enrol.user_id' => $id],['course.id','course.title'],null,null)->getResultArray();
            
            return view('Admin/Student_fee/add', $this->data);
        }
    }

    
    public function edit($id) 
    {
        if ($this->request->getMethod() === 'post') 
        {
            $user_id = $this->request->getPost('user_id');
            $amount = $this->request->getPost('amount');
    
            //  $course_amount = $this->users_model->get_join(
            //     [
            //         ['course', 'course.id = users.course_id'],
            //     ],
            //     ['users.id' => $user_id],
            //     ['course.total_amount']
            // )->getRowArray();
 
            // $total_course_amount = $course_amount['total_amount'];
            // $existing_payments = $this->student_fee_model->get(
            //     ['user_id' => $user_id, 'id !=' => $id],
            //     ['amount']
            // )->getResultArray();
    
            // $total_payment = array_sum(array_column($existing_payments, 'amount'));
    
            // if (($total_payment + $amount) > $total_course_amount) {
            //     session()->setFlashdata('message_danger', "Amount exceeds the total course amount.");
            // } else {
                $student_data = [
                    'installment_details' => $this->request->getPost('installment_details'),
                    'amount'              => $amount,
                    'due_date'            => $this->request->getPost('due_date'),
                    'course_id'           => $this->request->getPost('course_id'),
                    'payment_mode'        => $this->request->getPost('payment_mode'),
                    'paid_date'           => $this->request->getPost('payment_date'),
                    'payment_to'          => $this->request->getPost('payment_to'),
                    'status'              => $this->request->getPost('status'),
                    'updated_by'          => get_user_id(),
                    'updated_at'          => date('Y-m-d H:i:s')
                ];
    
                $student_result = $this->student_fee_model->edit($student_data, ['id' => $id]);
    
                if ($student_result) {
                    session()->setFlashdata('message_success', "Student Fee Updated Successfully!");
                } else {
                    session()->setFlashdata('message_danger', "Something went wrong while updating student details! Try Again.");
                }
            //}
    
            return redirect()->to(base_url('admin/students/edit/'.$user_id.'?active=4'));
        } 
        else
        {
            // Load the edit view with current data
            $user_id = $this->student_fee_model->get(['id' => $id])->getRowArray()['user_id'];
            $this->data['courses'] = $this->course_model->get_join(
            [['enrol', 'enrol.course_id = course.id']],[ 'enrol.user_id' => $user_id],['course.id','course.title'],null,null)->getResultArray();

            $this->data['edit_data'] = $this->student_fee_model->get(['id' => $id])->getRowArray();
            $this->data['student_id'] = $id;
            return view('Admin/Student_fee/edit', $this->data);
        }
    }

    
    public function delete(){
        $id = $this->request->getVar('id');
        $user_id = $this->request->getVar('student_id');
        if ($id > 0){
            if ($this->student_fee_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Student Payment Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/students/edit/'.$user_id.'?active=4'));
    }


    

}
