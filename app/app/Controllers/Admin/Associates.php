<?php

namespace App\Controllers\Admin;
use App\Models\Users_model;
// use App\Models\Consultant_universities_model;
// use App\Models\University_model;
use App\Models\Country_model;

class Associates extends AppBaseController
{
    private $users_model;
    private $university_model;
    private $consultant_universities_model;
    
    public function __construct()
    {
        parent::__construct();
        $this->users_model = new Users_model();
        // $this->university_model = new University_model();
        // $this->consultant_universities_model = new Consultant_universities_model();
        $this->country_model = new Country_model();
    }

    public function index(){
        $search_key = $this->request->getGet('search_key');
        $status = $this->request->getGet('status');
        $where = [];
        $where['role_id'] = 10;
        $this->data['active_associates'] = $this->users_model->get($where)->getNumRows();
        if (isset($search_key)) {
            // Use an array to build OR conditions
            $where = [
                'role_id' => 10,
                'OR' => [
                    'name LIKE' => "%$search_key%",
                    'phone LIKE' => "%$search_key%",
                    'email LIKE' => "%$search_key%"
                ]
            ];
        }
        if(isset($status)){
            $where['drop_out_status'] = $status;
        }
        $this->data['list_items'] = $this->users_model->get($where)->getResultArray();
        // $universities = $this->university_model->get()->getResultArray();
        
        // $this->data['universities'] = array_column($universities, 'title', 'id');
        // echo"<pre>";print_r($this->data);die();
        $this->data['page_title'] = 'Associates';
        $this->data['page_name'] = 'Associates/index';
        return view('Admin/index', $this->data);
    }
    
    public function view($id){
        
        $this->data['view_data'] = $this->users_model->get_join(
            [
                ['countries', 'countries.country_id = users.country_id']
            ],
            ['users.id' => $id],
            ['users.*', 'countries.country']
        )->getRowArray();
        
        
        $students = $this->users_model->get_join(
            [   ['user_details', 'user_details.user_id = users.id'],
                ['enrol', 'enrol.user_id = users.id'],
                ['countries', 'countries.country_id = user_details.nationality'],
            ],
            ['users.role_id' => 2, 'enrol.pipeline_user' => $id],
            ['users.name', 'countries.country'],null,null,['users.id']
        )->getResultArray();
        
        $total_student = count($students); 
        
        
        $this->data['view_data']['students'] = $students;
        $this->data['view_data']['total_students'] = $total_student;
        
        //$universities = $this->university_model->get()->getResultArray();
        //$this->data['full_universities'] = array_column($universities, 'title', 'id');
        echo view('Admin/Associates/ajax_view', $this->data);
    }

    public function ajax_add(){
        $this->data['countries'] = $this->country_model->get([],['country_id','country'])->getResultArray();
        $this->data['country_code'] = get_country_code();
        //$this->data['universities'] = $this->university_model->get()->getResultArray();
        echo view('Admin/Associates/ajax_add', $this->data);
    }

    public function add() {
        if ($this->request->getMethod() === 'post') {
            // Retrieve POST data
            $code = $this->request->getPost('code');
            $phone = $this->request->getPost('phone');
            $email = $this->request->getPost('email');
    
            // Check for duplicate phone number and email
            $check_phone_duplication = $this->users_model->get(['country_code' => $code, 'phone' => $phone, 'role_id' => 10])->getNumRows();
            $check_email_duplication = $this->users_model->get(['user_email' => $email, 'role_id' => 10])->getNumRows();
            
    
            if ($check_phone_duplication == 0 && $check_email_duplication == 0) {
                // Prepare data array to insert
                $data = [
                    'name'                  => $this->request->getPost('name'),
                    'user_email'            => $email,
                    'country_code'          => $code,
                    'phone'                 => $phone,
                    'email'                 => $code.$phone,
                    'role_id'               => 10, 
                    'gender'                => $this->request->getPost('gender'),
                    'dob'                   => $this->request->getPost('dob'),
                    'country_id'           => $this->request->getPost('nationality'),
                    'languages_spoken'      => $this->request->getPost('languages_spoken'),
                    'highest_qualification' => $this->request->getPost('highest_qualification'),
                    'date_of_joining'       => $this->request->getPost('doj'),
                    'drop_out_status'       => $this->request->getPost('status'),
                    //'username'              => $this->request->getPost('username'),
                    'password'              => password_hash($this->request->getPost('password'), PASSWORD_DEFAULT),
                    'assigned_universities' => json_encode($this->request->getPost('university')), 
                    'created_at'            => date('Y-m-d H:i:s'),
                    'created_by'            => get_user_id()
                ];
    
                // Handle profile picture upload
                $image = $this->upload_file('users/profile_picture', 'profile_picture');
                if ($image && valid_file($image['file'])) {
                    $data['profile_picture'] = $image['file'];
                }
    
                // Add data to database
                $response = $this->users_model->add($data);
                
               if ($response) {
                   
                    // $mail_data = [
                    //     'consultant_name' => $this->request->getPost('name'),
                    //     'username' => $this->request->getPost('username'),
                    //     'email' => $email,
                    //     'password' => $this->request->getPost('password'),
                    //     'login_url' => base_url('login')
                    // ];
                
                    // $name = $this->request->getPost('name');          
                    // $subject = "Welcome Aboard! Your CRM Login Credentials"; 
                    // $body = view('Admin/Email_template/welcome', $mail_data);
                  
                    // send_email($email, $name, $subject, $body);
                
                    session()->setFlashdata('message_success', "Associates Added Successfully!");
                } else {
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }

            } else {
                session()->setFlashdata('message_danger', "User Already Exists");
            }
        }
        return redirect()->to(base_url('Admin/associates/index'));
    }


    public function ajax_edit($id){
        $this->data['countries'] = $this->country_model->get([],['country_id','country'])->getResultArray();
        //$this->data['universities'] = $this->university_model->get()->getResultArray();
        $this->data['country_code'] = get_country_code();
        $this->data['edit_data'] = $this->users_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Associates/ajax_edit', $this->data);
    }

    public function edit($id){
        if ($this->request->getMethod() === 'post'){
            
            $code = $this->request->getPost('code');
            $phone = $this->request->getPost('phone');
            $email = $this->request->getPost('email');
            
            $check_phone_duplication = $this->users_model->get(['country_code' => $code , 'phone' => $phone, 'id !=' => $id, 'role_id' => 10])->getNumRows();
            $check_email_duplication = $this->users_model->get(['user_email' => $email, 'id !=' => $id, 'role_id' => 10])->getNumRows();
            if($check_phone_duplication == 0 && $check_email_duplication == 0){
                $data = [
                   'name'                  => $this->request->getPost('name'),
                    'user_email'            => $email,
                    'country_code'          => $code,
                    'phone'                 => $phone,
                    'email'                 => $code.$phone,
                    'gender'                => $this->request->getPost('gender'),
                    'dob'                   => $this->request->getPost('dob'),
                    'country_id'           => $this->request->getPost('country_id'),
                    'languages_spoken'      => $this->request->getPost('languages_spoken'),
                    'highest_qualification' => $this->request->getPost('highest_qualification'),
                    'date_of_joining'       => $this->request->getPost('doj'),
                    'drop_out_status'       => $this->request->getPost('status'),
                    'assigned_universities' => json_encode($this->request->getPost('university')), 
                    'updated_by' => get_user_id(),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
                $profile_picture = $this->upload_file('users/profile_picture','profile_picture');
                
                if($profile_picture && valid_file($profile_picture['file'])){
                    $data['profile_picture'] = $profile_picture['file'];
                } 
                 
                $response = $this->users_model->edit($data, ['id' => $id]);
                if ($response){
                    session()->setFlashdata('message_success', "Associates Updated Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            }else{
                session()->setFlashdata('message_danger', "User Already Exists");
            }
            
        }
        return redirect()->to(base_url('Admin/associates/index'));
    }

    public function ajax_view($id){
        $this->data['view_data'] = $this->college_model->get(['id' => $id])->getRowArray();
        echo view('Admin/College/ajax_view', $this->data);
    }

    public function delete($id){
        if ($id > 0){
            if ($this->users_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Associates Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('Admin/associates/index'));
    }
    public function delete_university($university_id, $consultant_id){
        // Fetch the course to get the current `semester_id` JSON array
        $current_consultant = $this->users_model->get(['id' => $consultant_id])->getRowArray();
    
        // Decode the existing semester_id JSON array
        $existing_university_ids = json_decode($current_consultant['assigned_universities'], true);
    
        // Check if `semester_id` array is valid and remove the specified ID
        if (is_array($existing_university_ids)) {
            // Filter out the `semester_id` to be deleted
            $updated_university_ids = array_filter($existing_university_ids, function($id) use ($university_id) {
                return $id != $university_id;
            });
    
            // Update the course record with the modified semester_id array
            $update_data['assigned_universities'] = json_encode(array_values($updated_university_ids)); // Reindex the array
    
            $this->users_model->edit($update_data, ['id' => $consultant_id]);
        }
        return redirect()->to(base_url('Admin/consultant/assigned_universities/'.$consultant_id));
    }
    
    public function assigned_universities($id){
        // $this->data['user_data'] = $this->users_model->get(['id' => $id])->getRowArray();
        // $this->data['university_data'] = $this->consultant_universities_model->get_join(
        //     [
        //         ['users', 'users.id = consultant_universities.user_id'],
        //         ['university', 'university.id = consultant_universities.university_id'],
        //     ],
        //     ['consultant_universities.user_id' => $id],
        //     ['consultant_universities.*', 'users.name as user_name', 'university.title as university_title']
        // )->getResultArray();
        $consultant_array = $this->users_model->get(['id' => $id])->getRowArray();
        $this->data['user_data'] = $consultant_array;
        $university_array = json_decode($consultant_array['assigned_universities']);
        
        $this->data['university_data'] =  $this->university_model->get(['id' => $university_array])->getResultArray();
   
        $this->data['consultant_id'] = $id;
        $this->data['page_title'] = 'Assigned Universities';
        $this->data['page_name'] = 'Associates/assigned_universities';
        return view('Admin/index', $this->data);
    }
    public function ajax_add_universities($id) {
        $current_consultant = $this->users_model->get(['id' => $id])->getRowArray();
    
        // Assuming the 'university_id' is the column that holds the IDs
        $assigned_university_ids = json_decode($current_consultant['assigned_universities']); 
    
        // echo "<pre>"; 
        // print_r($assigned_university_ids); 
        // die();
        $this->data['consultant_id'] = $id;
        $this->data['universities'] = $this->university_model->get()->getResultArray();
        $this->data['assigned_university_ids'] = $assigned_university_ids;
        echo view('Admin/Associates/ajax_add_university', $this->data);
    }
    public function add_university($consultant_id){
        $data = [
            'assigned_universities'  => json_encode($this->request->getPost('university')),
        ];
        $response = $this->users_model->edit($data, ['id' => $consultant_id]);
        if ($response){
            session()->setFlashdata('message_success', "Associates Updated Successfully!");
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/consultant/assigned_universities/'.$consultant_id));
    }
    
    public function overview(){
        return $this->construction_page();
        $this->data['page_title'] = 'Associates overview';
        $this->data['page_name'] = 'Associates/overview';
        return view('Admin/index', $this->data);
    }
    
    public function performance(){
        $search_key = $this->request->getGet('search_key');
        $status = $this->request->getGet('status');
        $university_id = $this->request->getGet('university');
        $where = [];
        $where['role_id'] = 6;
        if (isset($search_key)) {
            // Use an array to build OR conditions
            $where = [
                'role_id' => 6,
                'OR' => [
                    'name LIKE' => "%$search_key%",
                    'phone LIKE' => "%$search_key%",
                    'email LIKE' => "%$search_key%"
                ]
            ];
        }
        if(isset($status)){
            $where['status'] = $status;
        }
        
        $this->data['list_items'] = $this->users_model->get($where)->getResultArray();
        
        $consultant_ids = array_column($this->data['list_items'], 'id');
        
        $university_where = '';
        // if (isset($university_id)) {
        //     $university_where = 'users.university_id => ' . $university_id.",";
        // }
        
        $fees = $this->users_model->get_join(
            [
                ['students', 'students.student_id = users.id'],
            ],
            [$university_where.'users.role_id' => 4, 'students.consultant_id IN (' . implode(',', $consultant_ids) . ')'],
            ['students.consultant_id', 'students.fee']
        )->getResultArray();
        
        $fee_map = [];
        foreach ($fees as $fee) {
            $fee_map[$fee['consultant_id']][] = $fee['fee'];
        }
        
        foreach ($this->data['list_items'] as $key => $student) {
            $this->data['list_items'][$key]['total_students'] = $this->users_model->get_join(
                [
                    ['students', 'students.student_id = users.id'],
                ],
                ['users.role_id' => 4, 'students.consultant_id' => $student['id']],
                []
            )->getNumRows();
            
            $this->data['list_items'][$key]['total_fee_students'] = array_sum($fee_map[$student['id']] ?? []);
        }
        
        $universities = $this->university_model->get()->getResultArray();
        
        $this->data['universities'] = array_column($universities, 'title', 'id');
        $this->data['page_title'] = 'Performance Analytics';
        $this->data['page_name'] = 'Associates/performance';
        return view('Admin/index', $this->data);
    }
    
    public function view_performance($id){
        
        $this->data['view_data'] = $this->users_model->get(['id' => $id])->getRowArray();
        
        $students = $this->users_model->get_join(
            [
                ['students', 'students.student_id = users.id'],
            ],
            ['users.role_id' => 4, 'students.consultant_id' => $id],
            ['students.fee', 'users.name']
        )->getResultArray();
        
        $total_student = count($students); 
        
        $total_fee_students = array_sum(array_column($students, 'fee')); 
        
        $this->data['view_data']['students'] = $students;
        $this->data['view_data']['total_students'] = $total_student;
        $this->data['view_data']['total_fee_students'] = $total_fee_students;
        
        $universities = $this->university_model->get()->getResultArray();
        $this->data['universities'] = array_column($universities, 'title', 'id');
        echo view('Admin/Associates/view_performance', $this->data);
    }
    
    public function admissions(){
        $search_key = $this->request->getGet('search_key');
        $student_status = $this->request->getGet('student_status');
        $university_id = $this->request->getGet('university_id');
        $where = [];
        $where['users.role_id'] = 4;
        
        if (isset($search_key)) {
            $where['(users.name LIKE'] = "%$search_key%";
            $where['OR users.phone LIKE'] = "%$search_key%";
            $where['OR users.email LIKE)'] = "%$search_key%";
        }
        
        if (isset($student_status) && $student_status != '') {
            $where['students.student_status'] = $student_status;
        }
        
         if (isset($university_id) && !empty($university_id)) {
            $where['users.university_id'] = $university_id;
        }
        
        $this->data['list_items'] = $this->users_model->get_join(
            [
                ['students', 'students.student_id = users.id']
            ],
            $where,
            ['users.*', 'students.consultant_id','students.student_status','students.fee']
        )->getResultArray();
        
        $universities = $this->university_model->get()->getResultArray();
        $consultants = $this->users_model->get()->getResultArray();
        $total_fee = array_sum(array_column($this->data['list_items'], 'fee'));
        
        // echo "<pre>"; print_r($this->data['list_items']); exit;
        
        $this->data['consultants'] = array_column($consultants, 'name', 'id');
        $this->data['universities'] = array_column($universities, 'title', 'id');
         $this->data['total_fee'] = $total_fee;
        $this->data['page_title'] = 'Admissions';
        $this->data['page_name'] = 'Associates/admissions';
        return view('Admin/index', $this->data);
    }
    
    public function view_admission($id){
        $this->data['view_data'] = $this->users_model->get_join(
            [
                ['students', 'students.student_id = users.id'],
            ],
            ['users.id' => $id],
            ['users.*', 'students.student_id','students.enrollment_id','students.dob','students.gender','students.address','students.consultant_id','students.fee','students.academic_summaries','students.documents','students.student_status']
        )->getRowArray();
        
        $this->data['universities'] = array_column($this->university_model->get()->getResultArray(), 'title', 'id');
        $this->data['consultants'] = array_column($this->users_model->get(['role_id' => 6],['id','name'])->getResultArray(), 'name', 'id');
        echo view('Admin/Associates/view_admissions', $this->data);
    }
    
    public function revenue(){
        return $this->construction_page();
        
        $this->data['view_data'] = $this->users_model->get_join(
            [
                ['students', 'students.consultant_id = users.id'],
            ],
            ['users.role_id' => 6],
            ['users.id','users.name','students.fee']
        )->getResultArray();
        
        foreach ($this->data['view_data'] as $item) {
            $id = $item['id'];
            $result[$id]['id'] = $id;
            $result[$id]['name'] = $item['name'];
            $result[$id]['total_fee'] = ($result[$id]['total_fee'] ?? 0) + (float)($item['fee'] ?? 0);
        }
        
        // echo "<pre>"; print_r($result); exit; 
        
        $total_fee_students = array_sum(array_column($students, 'fee')); 
        
        $this->data['view_data']['students'] = $students;
        $this->data['view_data']['total_fee_students'] = $total_fee_students;
        
        $this->data['page_title'] = 'Revenue';
        $this->data['page_name'] = 'Associates/revenue';
        return view('Admin/index', $this->data);
    }
    
    public function source_analytics(){
        return $this->construction_page();
    }
    
    public function edit_password($id){
        if($this->request->getMethod() == 'post'){
            $email = $this->request->getPost('email');
            $check_username_duplication = $this->users_model->get(['user_email' => $email, 'id !=' => $id])->getNumRows();
            if($check_username_duplication == 0){
                $data = [
                    'user_email' =>  $email,
                    'password'=> $this->users_model->password_hash($this->request->getPost('password')),
                    'updated_by' => get_user_id(),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
                $response = $this->users_model->edit($data, ['id' => $id]);
                if ($response){
                    session()->setFlashdata('message_success', "Email and password updated Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            }else{
                session()->setFlashdata('message_danger', "Email Already Exists");
            }
            return redirect()->to($this->request->getServer('HTTP_REFERER'));  
        } else {
            $this->data['edit_data'] = $this->users_model->get(['id' => $id])->getRowArray();
            return view('Admin/Associates/edit_password', $this->data);
        }
    }


    public function active_status($id)
    {

        $data = [
            'drop_out_status'  =>  1,
            'updated_by' => get_user_id(),
            'drop_out_at' => date('Y-m-d H:i:s'),
        ];

        $response = $this->users_model->edit($data, ['id' => $id]);
        if ($response) {
            session()->setFlashdata('message_success', "User Marked as Active Successfully!");
        } else {
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to($this->request->getServer('HTTP_REFERER'));
    }

    
    public function inactive_status($id)
    {

        $data = [
            'drop_out_status'      =>  0,
            'updated_by' => get_user_id(),
            'drop_out_at' => date('Y-m-d H:i:s'),
        ];

        $response = $this->users_model->edit($data, ['id' => $id]);
        if ($response) {
            session()->setFlashdata('message_success', "User Marked as Inactive Successfully!");
        } else {
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }

        return redirect()->to($this->request->getServer('HTTP_REFERER'));
    }

}
