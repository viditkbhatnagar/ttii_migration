<?php
namespace App\Controllers\Admin;
use App\Models\Users_model;
use App\Models\Course_model;
use App\Models\Subject_model;
use App\Models\Cohorts_model;
use App\Models\Centres_model;
use App\Models\Wallet_transactions_model;
use App\Models\Languages_model;
use App\Models\Cohort_students_model;
use App\Models\Live_class_model;


use App\Models\Country_model;
use App\Models\State_model;
use App\Models\District_model;
use App\Models\Centre_fundrequests_model;
use App\Models\Centre_course_plans_model;

class Centres extends AppBaseController
{
    private $users_model;
    private $course_model;
    private $subject_model;
    private $centres_model; 
    private $wallet_transactions_model;
    private $cohorts_model;
    private $languages_model;
    private $cohort_students_model;
    private $live_class_model;
    
    private $centre_fundrequests_model;
    private $centre_course_plans_model;
    
    public function __construct()
    {
        parent::__construct();
        $this->users_model = new Users_model();
        $this->centres_model = new Centres_model();
        $this->wallet_transactions_model = new Wallet_transactions_model();
        $this->course_model = new Course_model();
        $this->subject_model = new Subject_model();
        $this->cohorts_model = new Cohorts_model();
        $this->languages_model = new Languages_model();
        $this->cohort_students_model = new Cohort_students_model();
        $this->live_class_model = new Live_class_model();
        
        $this->country_model = new Country_model();
        $this->state_model = new State_model();
        $this->district_model = new District_model();
        
        $this->centre_fundrequests_model = new Centre_fundrequests_model();
        $this->centre_course_plans_model = new Centre_course_plans_model();

    }

    public function index()
    {
        $filter_where =[];
        if ($this->request->getGet('centre_id')) 
        {
            $filter_where['centre_id'] = $this->request->getGet('centre_id');
        }
        if ($this->request->getGet('centre_name')) 
        {
            $filter_where['centre_name'] = $this->request->getGet('centre_name');
        }
        if ($this->request->getGet('contact_name')) 
        {
            $filter_where['contact_person'] = $this->request->getGet('contact_name');
        }
        if ($this->request->getGet('contact_phone')) 
        {
            $filter_where['phone'] = $this->request->getGet('contact_phone');
        }
        
        $this->data['list_items'] = $this->centres_model->get($filter_where,[],['id','desc'])->getResultArray();

        foreach ($this->data['list_items'] as $key => $value) {
             $this->data['list_items'][$key]['students_count'] = $this->users_model->get(['role_id' => 2,'added_under_centre'=>$value['id']],['id'])->getNumRows();
        }   

       
        
        $this->data['page_title'] = 'Centres';
        $this->data['page_name'] = 'Centres/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add(){
        // $lastId  = $this->centres_model->get([],[],['id','desc'])->getRow();
        //     log_message('error', '$lastId :'.print_r( $lastId ,true));
        
        //     if(!empty($lastId))
        //     {
        //         $num = (int)substr($lastId->centre_id,3); // Extract numeric part: 2
        //         // log_message('error', '$num :'.print_r( $num ,true));
        //         $nextNum = $num + 1; 
        //         // log_message('error', '$nextNum :'.print_r( $nextNum ,true));
        //         $this->data['next_id'] = 'TTC' . str_pad($nextNum, 4, '0', STR_PAD_LEFT);
        //         // log_message('error', 'next_id :'.print_r( $this->data['next_id'] ,true));
        //     }
        //     else    
        //     {
        //         $this->data['next_id'] = 'TTC' . str_pad(1, 4, '0', STR_PAD_LEFT); // Format: TT0003
        //     }
        echo view('Admin/Instructor/ajax_add', $this->data);
    }

    public function add()
    {
            //
            $lastId  = $this->centres_model->get([],[],['id','desc'])->getRow();
        
            if(!empty($lastId)&& !empty($lastId->centre_id))
            {
                $num = (int)substr($lastId->centre_id,3); // Extract numeric part: 2
                // log_message('error', '$num :'.print_r( $num ,true));
                $nextNum = $num + 1; 
                // log_message('error', '$nextNum :'.print_r( $nextNum ,true));
                $centre_code = 'TTC' . str_pad($nextNum, 4, '0', STR_PAD_LEFT);
                $final_id = $lastId->id + 1;
                // $this->data['next_id'] = $final_id;
                // log_message('error', 'next_id :'.print_r( $this->data['next_id'] ,true));
                $this->data['next_id'] = $lastId->id + 1;
            }
            else    
            {
                // $this->data['next_id'] = 'TTC' . str_pad(1, 4, '0', STR_PAD_LEFT); // Format: TT0003
                $this->data['next_id'] = 1;
                $centre_code = 'TTC' . str_pad(1, 4, '0', STR_PAD_LEFT);
                $final_id = 1;
            }
            
        if ($this->request->getMethod() === 'post')
        {
            $centre_id = $this->request->getPost('centre_id');
            $phone = $this->request->getPost('phone');
            $code = $this->request->getPost('code');

            $check_phone_duplication = $this->centres_model->get(['country_code' => $code ,'phone' => $phone])->getNumRows();
            $check_centre_id_duplication = $this->centres_model->get(['centre_id' => $centre_id])->getNumRows();
            $check_email_duplication = $this->users_model->get(['user_email' => $this->request->getPost('email'),'role_id' => 7])->getNumRows();
            
            //. getNumRows return count of rows
            
            // GETTING USER ID
            // $user_id = $this->users_model->add($centre_data);
            
            if($check_phone_duplication == 0 && $check_centre_id_duplication == 0 && $check_email_duplication == 0) 
            {
                $data = [
                    // 'centre_id' => $this->request->getPost('centre_id'),
                    'centre_id' => $final_id,
                    'centre_name' => $this->request->getPost('centre_name'),
                    'country_id' => $this->request->getPost('country_id') ?: null,
                    'state_id' => $this->request->getPost('state_id') ?: null,
                    'district_id' => $this->request->getPost('district_id') ?: null,
                    'address' => $this->request->getPost('address'),
                    'contact_person' => $this->request->getPost('contact_person'),
                    'contact_person_designation' => $this->request->getPost('contact_person_designation'),
                    'country_code' => $code,
                    'phone'=> $phone,
                    'whatsapp' => $this->request->getPost('whatsapp_code').$this->request->getPost('whatsapp'),
                    'secondary_phone' => $this->request->getPost('secondary_code').$this->request->getPost('secondary_phone'),

                    'email' => $this->request->getPost('email'),
                    'date_of_registration' => $this->request->getPost('date_of_registration'),
                    'date_of_expiry' => $this->request->getPost('date_of_expiry'),
                    
                    'created_by' => get_user_id(),
                    'updated_by' => get_user_id(),
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
                
                $doc1 = $this->upload_file('centres','registraion_certificate');
                if($doc1 && valid_file($doc1['file'])){
    				$data['registraion_certificate'] = $doc1['file'];
    			}    			
    			
    			$doc2 = $this->upload_file('centres','affiliation_document');
                if($doc2 && valid_file($doc2['file'])){
    				$data['affiliation_document'] = $doc2['file'];
    			}
			
                $centre = $this->centres_model->add($data);
                
                if ($centre){
                    // Add to users table
                    // $last_user_id = $this->users_model->get([],[],['id','desc'])->getRow();
                    // $user_id = $last_user_id['id'];
                    $password = $this->request->getPost('password');
                    $centre_data = [
                        'centre_id' => $final_id,
                        'name' => $this->request->getPost('centre_name'),
                        'user_email' => $this->request->getPost('email'),
                        'country_code'      => $code,
                        'phone'     => $phone,
                        'role_id' => 7,
                        // 'user_type' => 'centre', // optional: if you differentiate user roles
                        'password' => $this->users_model->password_hash($password), // Or generate a dynamic one
                        'created_by' => get_user_id(),
                        'updated_by' => get_user_id(),
                        'created_at' => date('Y-m-d H:i:s'),
                        'updated_at' => date('Y-m-d H:i:s'),
                    ];
                    $user_id = $this->users_model->add($centre_data);
                    
                    // $centre_data['user_id'] = $user_id;
                    session()->setFlashdata('message_success', "Centre Added Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            }
            else
            {
                session()->setFlashdata('message_danger', "Centre with same Centre ID or Phone/Email already exists");
            }
            
            return redirect()->to(base_url('admin/Centres/index'));

        }
        
        $this->data['countries'] = $this->country_model->get([], ['country_id', 'country'])->getResultArray();
        $this->data['country_code'] = get_country_code();
        
        // echo "<pre>"; print_r($this->data); exit();
        // log_message('error','Next Id:'.print_r($this->data['next_id'],true));
        // log_message('error', 'Final next_id: ' . $this->data['next_id']);


        $this->data['page_title'] = 'Add Centre';
        $this->data['page_name'] = 'Centres/add';
        return view('Admin/index', $this->data);
    }

    public function ajax_edit($id){
        $this->data['edit_data'] = $this->users_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Centres/edit', $this->data);
    }

    public function edit($id)
    {
        if ($this->request->getMethod() === 'post')
        {
            $centre_id = $this->request->getPost('centre_id');
            $phone = $this->request->getPost('phone');
            $code = $this->request->getPost('code');
            $password = $this->request->getPost('password');
            
 
            $check_phone_duplication = $this->centres_model->get(['country_code' => $code ,'phone' => $phone,'id !=' => $id])->getNumRows();
            $check_centre_id_duplication = $this->centres_model->get(['centre_id' => $centre_id,'id !=' => $id])->getNumRows();
            $check_email_duplication = $this->users_model->get(['user_email' => $this->request->getPost('email'),'centre_id !=' => $id,'role_id' => 7])->getNumRows();

            if($check_phone_duplication == 0 && $check_centre_id_duplication == 0 && $check_email_duplication == 0) 
            {
                $data = [
                    'centre_id' => $this->request->getPost('centre_id'),
                    'centre_name' => $this->request->getPost('centre_name'),
                    'country_id' => $this->request->getPost('country_id') ?: null,
                    'state_id' => $this->request->getPost('state_id') ?: null,
                    'district_id' => $this->request->getPost('district_id') ?: null,
                    'address' => $this->request->getPost('address'),
                    'contact_person' => $this->request->getPost('contact_person'),
                    'contact_person_designation' => $this->request->getPost('contact_person_designation'),
                    'country_code'      => $code,
                    'phone'     => $phone,
                    
                    'whatsapp' => $this->request->getPost('whatsapp'),
                    'secondary_phone' => $this->request->getPost('secondary_phone'),

                    'email' => $this->request->getPost('email'),
                    'date_of_registration' => $this->request->getPost('date_of_registration'),
                    'date_of_expiry' => $this->request->getPost('date_of_expiry'),
                    
                    'updated_by' => get_user_id(),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
                
                $doc1 = $this->upload_file('centres','registraion_certificate');
                if($doc1 && valid_file($doc1['file'])){
    				$data['registraion_certificate'] = $doc1['file'];
    			}
    			
    			
    			$doc2 = $this->upload_file('centres','affiliation_document');
                if($doc2 && valid_file($doc2['file'])){
    				$data['affiliation_document'] = $doc2['file'];
    			}
			
                $centres = $this->centres_model->edit($data, ['id' => $id]);
                if ($centres)
                {
                    $user_data = $this->users_model->get(['centre_id' => $id])->getRowArray();
                    if($user_data){
                        // Update users table
                        $user_update = [
                            'name' => $this->request->getPost('centre_name'),
                            'user_email' => $this->request->getPost('email'),
                            'country_code'      => $code,
                            'phone'     => $phone,
                            'role_id' => 7,
                            'centre_id' => $id,
                            'updated_by' => get_user_id(),
                            'updated_at' => date('Y-m-d H:i:s'),
                        ];
                        if(!empty($password)){
                            $user_update['password'] = $this->users_model->password_hash($password);
                        }
                        $this->users_model->edit($user_update, ['centre_id' => $id]);
                    }else{
                        $user_data = [
                            'name' => $this->request->getPost('centre_name'),
                            'user_email' => $this->request->getPost('email'),
                            'country_code'      => $code,
                            'phone'     => $phone,
                            'role_id' => 7,
                            'centre_id' => $id,
                            'password' => $this->users_model->password_hash($password), // Or generate a dynamic one
                            'created_by' => get_user_id(),
                            'updated_by' => get_user_id(),
                            'created_at' => date('Y-m-d H:i:s'),
                            'updated_at' => date('Y-m-d H:i:s'),
                        ];
                        $this->users_model->add($user_data);
                    }
                    session()->setFlashdata('message_success', "Centre & User Updated Successfully!");
                    return redirect()->to(base_url('admin/centres/index'));
                    // session()->setFlashdata('message_success', "Centre Updated Successfully!");
                    // return redirect()->to(base_url('admin/centres/index'));
                }
                else
                {
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
                
            }
            else
            {
                session()->setFlashdata('message_danger', "Centre already exists with this phone/email!"); 
            }
            
        }
        
        $this->data['countries'] = $this->country_model->get([], ['country_id', 'country'])->getResultArray();
        $this->data['country_code'] = get_country_code();

       
        
        $this->data['edit_data'] = $this->centres_model->get(['id' => $id])->getRowArray();
        $this->data['page_title'] = 'Edit Centre';
        $this->data['page_name'] = 'Centres/edit';
        
        return view('Admin/index', $this->data);
    }

    public function view($id)
    {
        $this->data['view_data'] = $this->centres_model->get(['id' => $id])->getRowArray();
        $this->data['view_data']['centre_course_plans'] = $this->centre_course_plans_model->get_join([['course', 'course.id = centre_course_plans.course_id']],['centre_id' => $id],['centre_course_plans.*','course.title as course_title'])->getResultArray();
        //log_message('error',print_r($this->data,true));
        $this->data['page_title'] = 'Centre Details';
        $this->data['page_name'] = 'Centres/view';
        
        return view('Admin/index', $this->data);
    }

   public function delete($id)
{
    if ($id > 0) {
        // Step 1: Get the row from centres table using id
        $centre = $this->centres_model->get(['id' => $id])->getRowArray();
        // echo var_dump('$centre',$centre);

        if ($centre && isset($centre['centre_id'])) {
            // Step 2: Extract the centre_id
            $centre_id = $centre['centre_id'];
            // echo var_dump('$centre_id',$centre_id);

            // Step 3: Remove user with matching centre_id
            $userDeleted = $this->users_model->remove(['centre_id' => $centre_id]);
            // echo var_dump('$userDeleted',$userDeleted);

            // Step 4: Remove the centre itself
            $centreDeleted = $this->centres_model->remove(['id' => $id]);
            // echo var_dump('$centreDeleted',$centreDeleted); exit;

            // Step 5: Flash messages based on success
            if ($userDeleted && $centreDeleted) {
                session()->setFlashdata('message_success', "Centre Deleted Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }

        } else {
            session()->setFlashdata('message_danger', "Centre not found!");
        }
    } else {
        session()->setFlashdata('message_danger', "Invalid Centre ID!");
    }

    return redirect()->to(base_url('admin/centres/index'));
}

    
    
    
      public function upload_affiliation_document()
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
    
    public function course($id){
        
        $this->data['list_items'] = $this->instructor_enrol_model->get(['instructor_id' => $id])->getResultArray();

    
        $user = $this->users_model->get(['role_id'=>3])->getResultArray();
        $this->data['user'] = array_column($user, 'name', 'id');
        
        $course = $this->course_model->get()->getResultArray();
        $this->data['course'] = array_column($course, 'title', 'id');
        
        $this->data['instructor'] = $id;
        
        $this->data['page_title'] = 'Enrolled Courses';
        $this->data['page_name'] = 'Instructor/course';
        return view('Admin/index', $this->data);
    }
    
    
    
    
     public function ajax_enrol($id)
     {
        $this->data['instructor'] = $id;
        $this->data['course'] = $this->course_model->get()->getResultArray();

        echo view('Admin/Instructor/ajax_enrol', $this->data);
    }
    
    public function enrol_course(){
        if ($this->request->getMethod() === 'post'){
            $ins = $this->request->getPost('instructor_id');
            $data = [
                'course_id'=> $this->request->getPost('course_id'),
                'instructor_id'=> $this->request->getPost('instructor_id'),
                'created_by' => get_user_id(),
                'updated_by' => get_user_id(),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            
            if($this->instructor_enrol_model->get(['course_id' =>  $this->request->getPost('course_id'), 'instructor_id'=> $this->request->getPost('instructor_id')])->getNumRows()==0){
                $enrol = $this->instructor_enrol_model->add($data);
                if ($enrol){
                    session()->setFlashdata('message_success', "Enrolled Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            }else{
                session()->setFlashdata('message_danger', "Already Enrolled to this course");
            }
        }
        return redirect()->to(base_url('admin/instructor/course/'.$ins));
    }
    
    
     public function enrol_delete($id){
        if ($id > 0){
            if ($this->instructor_enrol_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/instructor/index'));
    }
    
    
    public function students($id){
        
        $this->data['list_items'] = $this->instructor_students_model->get_join(
                    [
                        ['users', 'users.id = instructor_students.student_id'],
                        ['course', 'course.id = instructor_students.course_id'],
                        
                    ],['instructor_id' => $id],['instructor_students.id','users.name','course.title','instructor_students.created_at']
                    )->getResultArray();
        
        
        // $this->instructor_students_model->get(['instructor_id' => $id])->getResultArray();
        
        $this->data['instructor'] = $id;
        
        $user = $this->users_model->get(['role_id'=>2])->getResultArray();
        $this->data['students'] = array_column($user, 'name', 'id');
        
        $course = $this->course_model->get()->getResultArray();
        $this->data['course'] = array_column($course, 'title', 'id');
        
        
        $this->data['page_title'] = 'Students';
        $this->data['page_name'] = 'Instructor/students';
        return view('Admin/index', $this->data);
    }
    
    
    //  public function ajax_assign($id)
    //  {
    //     $this->data['instructor'] = $id;

    //     $this->data['courses'] = $this->instructor_enrol_model->get_join(
    //                                 [
    //                                     ['course', 'course.id = instructor_enrol.course_id'],
    //                                 ],['instructor_enrol.instructor_id' => $id],['course.id','course.title']
    //                                 )->getResultArray();
        
    //      $this->data['list_items'] = $this->instructor_enrol_model->get(['instructor_id' => $id])->getResultArray();

    
    //     $user = $this->users_model->get(['role_id'=>3])->getResultArray();
    //     $this->data['user'] = array_column($user, 'name', 'id');
        
    //     $course = $this->course_model->get()->getResultArray();
    //     $this->data['course'] = array_column($course, 'title', 'id');
        
    //     $this->data['students'] = $this->users_model->get(['role_id'=>2])->getResultArray();

    //     echo view('Admin/Instructor/ajax_assign', $this->data);
    // }
    
    
     public function assign_student(){
        if ($this->request->getMethod() === 'post'){
            
            $ins = $this->request->getPost('instructor_id');
            $data = [
                'course_id'=> $this->request->getPost('course_id'),
                'instructor_id'=> $this->request->getPost('instructor_id'),
                'student_id'=> $this->request->getPost('student_id'),
                'created_by' => get_user_id(),
                'updated_by' => get_user_id(),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            $enrol = $this->instructor_students_model->add($data);
            if ($enrol){
                session()->setFlashdata('message_success', "Enrolled Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/instructor/students/'.$ins));
    }
    
    
      public function assign_delete($id){
        if ($id > 0){
            if ($this->instructor_students_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/instructor/index'));
    }
    
    
    public function change_device($id){
        if ($id > 0){
            $data['device_id'] = null;
            $response = $this->users_model->edit($data, ['id' => $id]);
            if($response){
                $res = true;
            }
            session()->setFlashdata('message_success', "Device changed Successfully!");
        }
        
        return redirect()->to(base_url('admin/instructor/index'));
    }

    public function wallet_transactions($centre_id){
        $credit = 'credit';
        $debit = 'debit';

        $this->data['centre_data'] = $this->centres_model->get(['id' => $centre_id])->getRowArray();
        $this->data['credits'] = $this->wallet_transactions_model->get(['transaction_type' => 'credit','centre_id' => $centre_id])->getResultArray();
        $this->data['debits'] = $this->wallet_transactions_model->get(['transaction_type' => 'debit','centre_id' => $centre_id])->getResultArray();

        $this->data['page_title'] = 'Wallet Transactions';
        $this->data['page_name'] = 'Wallet/transaction';
        return view('Admin/index', $this->data);
    }

    public function fund_requests($centre_id){
        $this->data['centre_db_id'] = $centre_id;
        $this->data['centre_name'] = $this->centres_model->get(['id' => $centre_id])->getRow()->centre_name ?? '';
        $this->data['list_items'] = $this->centre_fundrequests_model->get(['centre_id' => $centre_id])->getResultArray();

        $this->data['page_title'] = 'Fund Requests';
        $this->data['page_name'] = 'Centres/fund_requests';
        return view('Admin/index', $this->data);
    }

    public function change_fund_status($id)
    {
        $status = $this->request->getPost('status');

        if (!empty($status) && $id > 0) {
            $data['status'] = $status;
            $response = $this->centre_fundrequests_model->edit($data, ['id' => $id]);

            if ($response) {

                if($status == 'approved'){
                    $fund_data = $this->centre_fundrequests_model->get(['id' => $id])->getRowArray();

                    $centre_id = $fund_data['centre_id'];
                    $amount = $fund_data['amount'];
                    $data['wallet_balance'] = $this->centres_model->get(['id' => $centre_id])->getRow()->wallet_balance ?? 0;
                    $data['wallet_balance'] += $amount;


                    $this->wallet_transactions_model->add([
                        'centre_id' => $centre_id,
                        'amount' => $amount,
                        'transaction_type' => 'credit',
                        'remarks' => 'Fund Request Approved',
                        'created_by' => get_user_id(),
                        'created_at' => date('Y-m-d H:i:s'),
                    ]);
                    
                    $this->centres_model->edit($data, ['id' => $centre_id]);

                }
                return $this->response->setJSON([
                    'status' => true,
                    'message' => 'Status changed successfully'
                ]);
            }
        }

        return $this->response->setJSON([
            'status' => false,
            'message' => 'Update failed'
        ]);
    }


    public function delete_fund_request($id, $centre_id){
        if ($id > 0){
            if ($this->centre_fundrequests_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/centres/fund_requests/'.$centre_id));
    }
    
    public function ajax_assign_plan($id){
        $this->data['course_data'] = $this->course_model->get()->getResultArray();
        $this->data['centre_id'] = $id;
        echo view('Admin/Centres/ajax_assign_plan', $this->data);
    } 
    

    public function save_assign_plan(){
        $centre_id = $this->request->getPost('centre_id');
        $course_id = $this->request->getPost('course_id');
        $amount = $this->request->getPost('assigned_amount');
        $start_date = $this->request->getPost('start_date');
        $end_date = $this->request->getPost('end_date');

        $checl_exist = $this->centre_course_plans_model->get(['centre_id' => $centre_id, 'course_id' => $course_id])->getNumRows();
        if ($checl_exist > 0){
            session()->setFlashdata('message_danger', "Already assigned to this course");
            return redirect()->to(base_url('admin/centres/view/'.$centre_id));
        }
        $data = [
            'centre_id'=> $centre_id,
            'course_id'=> $course_id,
            'assigned_amount'=> $amount,
            'start_date'=> $start_date, 
            'end_date'=> $end_date,
            'created_by' => get_user_id(),
            'created_at' => date('Y-m-d H:i:s')
        ];
        $response = $this->centre_course_plans_model->add($data);
        if ($response){
            session()->setFlashdata('message_success', "Course Assigned Successfully!");
            
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/centres/view/'.$centre_id));
    }

    public function ajax_edit_plan($id){
        $this->data['course_data'] = $this->course_model->get()->getResultArray();
        $this->data['plan_data'] = $this->centre_course_plans_model->get(['id' => $id])->getRowArray();
        $this->data['centre_id'] = $this->data['plan_data']['centre_id'];
        echo view('Admin/Centres/ajax_edit_plan', $this->data);
    }

    public function edit_assign_plan(){
        $centre_id = $this->request->getPost('centre_id');
        $course_id = $this->request->getPost('course_id');
        $amount = $this->request->getPost('assigned_amount');
        $start_date = $this->request->getPost('start_date');
        $end_date = $this->request->getPost('end_date');
        $data = [
            'centre_id'=> $centre_id,
            'course_id'=> $course_id,
            'assigned_amount'=> $amount,
            'start_date'=> $start_date, 
            'end_date'=> $end_date,
            'created_by' => get_user_id(),
            'created_at' => date('Y-m-d H:i:s')
        ];
        $response = $this->centre_course_plans_model->add($data);
        if ($response){
            session()->setFlashdata('message_success', "Course Edited Successfully!");
            // return $this->response->setJSON([
            //     'status' => true
            // ]);
            
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/centres/view/'.$centre_id));
    }

    public function delete_assign_plan($id, $centre_id){
        if ($id > 0){
            if ($this->centre_course_plans_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/centres/view/'.$centre_id));
    }
    


    public function cohorts(){

        $filter = [];

        $filter['cohorts.centre_id !='] = null;
        if(!empty($this->request->getGet('cohort_date'))){
            $cohort_date = $this->request->getGet('cohort_date');
            if (!empty($cohort_date)) {
                [$year, $month] = explode('-', $cohort_date);
                $start_date = "{$year}-{$month}-01 00:00:00";
                $end_date = date('Y-m-t 23:59:59', strtotime($start_date));

                $filter['start_date >='] = $start_date;
                $filter['start_date <='] = $end_date;
            }
        }

        if (!empty($this->request->getGet('status'))) {
            $status = $this->request->getGet('status');
            if($status == 'active'){
                $filter['start_date <='] = date('Y-m-d H:i:s');
                $filter['end_date >='] = date('Y-m-d H:i:s');
            }
            elseif($status == 'completed'){
                $filter['end_date <'] = date('Y-m-d H:i:s');
            }
        }

        if (!empty($this->request->getGet('language'))) {
            $language = $this->request->getGet('language');
            $filter['language_id'] = $language;
        }

        if (!empty($this->request->getGet('course'))) {
            $course = $this->request->getGet('course');
            $filter['course_id'] = $course;
        }

        if (!empty($this->request->getGet('subject'))) {
            $subject = $this->request->getGet('subject');
            $filter['subject_id'] = $subject;
        }
        
        if (!empty($this->request->getGet('instructor'))) {
            $instructor = $this->request->getGet('instructor');
            $filter['instructor_id'] = $instructor;
        }


        // List by

        if (!empty($this->request->getGet('list_by'))) {
            $list_by = $this->request->getGet('list_by');
            if($list_by == 'active'){
                $filter['start_date <='] = date('Y-m-d H:i:s');
                $filter['end_date >='] = date('Y-m-d H:i:s');
            }
            elseif($list_by == 'completed'){
                $filter['end_date <'] = date('Y-m-d H:i:s');
            }
        }


        if(is_admin()){
        $this->data['list_items'] = $this->cohorts_model->get_join([['centres', 'centres.id = cohorts.centre_id']],$filter,['cohorts.*','centres.centre_name','centres.id as centre_db_id'])->getResultArray();
        }
        else{
            $filter['instructor_id'] = get_user_id();
            $this->data['list_items'] = $this->cohorts_model->get([['centres', 'centres.id = cohorts.centre_id']],$filter,['cohorts.*','centres.centre_name','centres.id as centre_db_id'])->getResultArray();
        }

        

        // Collect all course IDs
        $course_ids = array_column($this->data['list_items'], 'course_id');
        // Fetch all related courses in one query
        $courses = [];
        if (!empty($course_ids)) {
            $course_rows = $this->course_model->get(['id' => $course_ids])->getResultArray();  

            // Index courses by ID for quick lookup
            $courses = array_column($course_rows, 'title', 'id');
        }
        // Map courses to list_items
        foreach ($this->data['list_items'] as &$item) {
            $item['course_name'] = $courses[$item['course_id']] ?? null;
        }
        unset($item); 


        $subject_ids = array_column($this->data['list_items'], 'subject_id');
        $subjects = [];
        if (!empty($subject_ids)) {
            $subject_rows = $this->subject_model->get(['id' => $subject_ids])->getResultArray();

            // Index subjects by ID for quick lookup
            $subjects = array_column($subject_rows, 'title', 'id');
            foreach ($this->data['list_items'] as &$item) {
                $item['subject_name'] = $subjects[$item['subject_id']] ?? null;
            }
            unset($item);
        }



        $language_ids = array_column($this->data['list_items'], 'language_id');
        $languages = [];
        if (!empty($language_ids)) {
            $language_rows = $this->languages_model->get(['id' => $language_ids])->getResultArray();

            // Index languages by ID for quick lookup
            $languages = array_column($language_rows, 'title', 'id');
            foreach ($this->data['list_items'] as &$item) {
                $item['language_name'] = $languages[$item['language_id']] ?? null;
            }
            unset($item);
        }
        
        

        $instructor_ids = array_column($this->data['list_items'], 'instructor_id');
        $instructors = [];
        if (!empty($instructor_ids)) {
            $instructor_rows = $this->users_model->get(['id' => $instructor_ids])->getResultArray();

            // Index instructors by ID for quick lookup
            $instructors = array_column($instructor_rows, 'name', 'id');

            foreach ($this->data['list_items'] as &$item) {
                $item['instructor_name'] = $instructors[$item['instructor_id']] ?? null;
            }
            unset($item);
        }
        
        $cohort_ids = array_column($this->data['list_items'], 'id');

        if (!empty($cohort_ids)) {
            // Get all students in one query
            $cohort_students = $this->cohort_students_model->get(['cohort_id' => $cohort_ids])->getResultArray();

            // Group user_ids by cohort_id
            $students_by_cohort = [];
            foreach ($cohort_students as $row) {
                $students_by_cohort[$row['cohort_id']][] = $row['user_id'];
            }

            // Get all live classes in one query
            $live_classes = $this->live_class_model->get(['cohort_id' => $cohort_ids])->getResultArray();

            // Count live classes per cohort
            $classes_by_cohort = [];
            foreach ($live_classes as $row) {
                $classes_by_cohort[$row['cohort_id']] =
                    ($classes_by_cohort[$row['cohort_id']] ?? 0) + 1;
            }

            // Merge results into your list_items
            foreach ($this->data['list_items'] as &$item) {
                $item['students_count'] = isset($students_by_cohort[$item['id']])
                    ? count($students_by_cohort[$item['id']])
                    : 0;

                $item['lives_classes_count'] = $classes_by_cohort[$item['id']] ?? 0;
            }
            unset($item);
        }

        
        $this->data['course'] = $this->course_model->get()->getResultArray();
        $this->data['language'] = $this->languages_model->get()->getResultArray();
        $this->data['subject'] = $this->subject_model->get(['master_subject_id !=' => null],null,null,null,['title'])->getResultArray();
        $this->data['instructor'] = $this->users_model->get(['role_id' => 3])->getResultArray();
        $this->data['page_title'] = 'Cohorts';
        $this->data['page_name'] = 'Centres/cohorts';
        return view('Admin/index', $this->data);
    }

    public function centre_payments()
    {
        $fund_filter = [];
        if (!empty($this->request->getGet('status'))) {
            $status = $this->request->getGet('status');
            if($status == 'approved'){
                $fund_filter['centre_fund_requests.status'] = 'approved';
            }
            elseif($status == 'pending'){
                $fund_filter['centre_fund_requests.status'] = 'pending';
            }
            else{
                $fund_filter['centre_fund_requests.status'] = 'rejected';
            }
        }

        if (!empty($this->request->getGet('from_date')) && !empty($this->request->getGet('to_date'))){
            $fund_filter['centre_fund_requests.created_at >='] = $this->request->getGet('from_date') . ' 00:00:00';
            $fund_filter['centre_fund_requests.created_at <='] = $this->request->getGet('to_date') . ' 23:59:59';
        }

        $wallet_filter = [];
        if (!empty($this->request->getGet('from_date')) && !empty($this->request->getGet('to_date'))){
            $wallet_filter['wallet_transactions.created_at >='] = $this->request->getGet('from_date') . ' 00:00:00';
            $wallet_filter['wallet_transactions.created_at <='] = $this->request->getGet('to_date') . ' 23:59:59';
        }

        // Fund Requests with Centre Name
        $this->data['fund_requests'] = $this->centre_fundrequests_model->get_join([['centres', 'centres.id = centre_fund_requests.centre_id']], $fund_filter, ['centre_fund_requests.*', 'centres.centre_name', 'centres.centre_id','centres.id as centre_db_id'],['centre_fund_requests.id', 'DESC'])->getResultArray();

        // Wallet Transactions
        $this->data['wallet_transactions'] = $this->wallet_transactions_model->get_join([['centres', 'centres.id = wallet_transactions.centre_id']], $wallet_filter, ['wallet_transactions.*', 'centres.centre_name', 'centres.centre_id','centres.id as centre_db_id'],['wallet_transactions.id', 'DESC'])->getResultArray();

        $this->data['page_title'] = "Centre Funds & Wallet Transactions";
        $this->data['page_name']  = "Centres/payments";

        return view('Admin/index', $this->data);
    }

}
