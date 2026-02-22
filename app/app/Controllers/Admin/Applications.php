<?php
namespace App\Controllers\Admin;

use App\Models\Applications_model;
use App\Models\Batch_model;

use App\Models\Course_model;
use App\Models\Country_model;
use App\Models\Payment_model;

use App\Models\Languages_model;
use App\Models\Student_fee_model;
use App\Models\Student_document_model;
use App\Models\Qualification_model;

use App\Models\Users_model;
use App\Models\User_details_model;

use App\Models\Enrol_model;
use App\Models\Centres_model;

use App\Models\Centre_course_plans_model;
use App\Models\Wallet_transactions_model;

class Applications extends AppBaseController
{
    
    public function __construct()
    {
        parent::__construct();

        $this->applications_model = new Applications_model();
        
        $this->users_model = new Users_model();
        $this->user_details_model = new User_details_model();
        
        
        
        $this->batch_model = new Batch_model();
        $this->course_model = new Course_model();
        $this->payment_model = new Payment_model();
        $this->country_model = new Country_model();
        $this->languages_model = new Languages_model();
        $this->student_fee_model = new Student_fee_model();
        $this->student_document_model = new Student_document_model();
        $this->qualification_model = new Qualification_model();
        $this->enrol_model = new Enrol_model();
        $this->centres_model = new Centres_model();
        $this->centre_course_plans_model = new Centre_course_plans_model();
        $this->wallet_transactions_model = new Wallet_transactions_model();

    }

    public function index()
    {
        $filter_where = [];

        if (!empty($this->request->getGet('from_date')) && !empty($this->request->getGet('to_date'))){
            
            $filter_where = [
                    'applications.created_at >=' => $this->request->getGet('from_date'). ' 00:00:00',
                    'applications.created_at <=' => $this->request->getGet('to_date'). ' 23:59:59'
                ];
        }

        if ($this->request->getGet('filter_pipeline') > 0) {
            $filter_where['pipeline'] = $this->request->getGet('filter_pipeline');
        }
        if($this->request->getGet('course') > 0){
            $filter_where['course_id'] = $this->request->getGet('course');
        } 

        $role = get_role_id();

        // if ($role == 3) 
        // {
        //     $user_id = get_user_id();
        //     $course_data = $this->instructor_enrol_model->get(['instructor_id' => $user_id])->getResultArray();
            
        //     $students = [];
        //     foreach ($course_data as $course) {
        //         $students = $this->enrol_model->get_enroled_students($course['course_id']);
        //     }
        // } else {
        //     $students = $this->users_model->get($filter_where, null, ['id', 'desc'])->getResultArray();
        // }

        // if (!empty($students)) {
        //     foreach ($students as $key => $val) {
        //         $students[$key]['course'] = $this->enrol_model->get_join(
        //             [['course', 'course.id = enrol.course_id']],
        //             ['enrol.user_id' => $val['id']],
        //             ['course.id', 'title']
        //         )->getResultArray();
        //     }
        // }
        $filter_where['is_converted'] = 0;

        $students = $this->applications_model->get_join([
            ['course','course.id = applications.course_id'],
            ['users','users.id = applications.pipeline_user'],
        ],$filter_where, ['applications.*','course.title as course_title','users.name as pipeline_user'], ['id', 'desc'])->getResultArray();
        

        if ($status = $this->request->getGet('list_by')) {
            $validStatuses = [ 'rejected'];

                if (in_array($status, $validStatuses)) {
                    $students = array_filter($students, fn($stud) => $stud['status'] === $status);
                }
            }

        $rejected_count = 0;
        foreach ($students as $key => $val) {
            if($students[$key]['added_under_centre'] != null){
                $centre_data = $this->centres_model->get(['id' => $students[$key]['added_under_centre']])->getRow();
                $students[$key]['centre_name'] = $centre_data->centre_name ?? null;
                $students[$key]['centre_id'] = $centre_data->centre_id ?? null;
                
            }

            
            if($students[$key]['status'] == 'rejected') {
                $rejected_count++;
            }
        
        }

        


        $this->data['students'] = $students;
        $this->data['rejected_count'] = $rejected_count;
        $this->data['course'] = $this->course_model->get()->getResultArray();
        $this->data['page_title'] = 'Applications';
        $this->data['page_name'] = 'Applications/index';

        return view('Admin/index', $this->data);
    }

   
    public function add()
    {
        if ($this->request->getGet('active') != 2 && $this->request->getGet('active') != 3 ) {
            session()->remove('student_id');
        }

        if ($this->request->getMethod() === 'post') 
        {
            // echo "<pre>";
            // print_r($_POST); exit();
            $phone = $this->request->getPost('code') . $this->request->getPost('phone');

            $check_phone_duplication = $this->applications_model->get(['email' => $phone])->getNumRows();

            $check_email_duplication = $this->applications_model->get(['user_email' => $this->request->getPost('email')])->getNumRows();


            if ($check_phone_duplication == 0 && $check_email_duplication == 0) 
            {
                $data = [
                    'application_id' => $this->request->getPost('application_id'),
                    'name' => $this->request->getPost('name'),
                    'country_code' => $this->request->getPost('code'),
                    'phone' => $this->request->getPost('phone'),
                    'email' => $phone,
                    'user_email' => $this->request->getPost('email'),
                
                    'date_of_birth' => $this->request->getPost('DOB'),
                    'age' => $this->request->getPost('age'),
                    'gender' => $this->request->getPost('gender'),
                    'nationality' => $this->request->getPost('nationality'),
                    'marital_status' => $this->request->getPost('marital_status'),
                    'aadhar_no' => $this->request->getPost('aadhar_no'),
                    'passport_no' => $this->request->getPost('passport_no'),
                    'whatsapp_no' => $this->request->getPost('whatsapp_no'),
                    'second_code' => $this->request->getPost('second_code'),
                    'second_phone' => $this->request->getPost('second_phone'),
                    'country_id' => $this->request->getPost('country_id'),
                    'district' => $this->request->getPost('district'),
                    'state' => $this->request->getPost('state'),
                    'address' => $this->request->getPost('address'),
                    'native_address' => $this->request->getPost('native_address'),
                        
                    'father_name' => $this->request->getPost('father_name'),
                    'mother_name' => $this->request->getPost('mother_name'),
                    'guardian_name' => $this->request->getPost('guardian_name'),
                    'emergency_name' => $this->request->getPost('emergency_name'),
                    'emergency_phone' => $this->request->getPost('emergency_phone'),
                    'emergency_relation' => $this->request->getPost('emergency_relation'),

                    'learning_disabilities' => $this->request->getPost('learning_disabilities'),
                    'accessibility_needs' => $this->request->getPost('accessibility_needs'),
                    'marketing_source' => $this->request->getPost('marketing_source'),
                    'pipeline' => $this->request->getPost('pipeline'),
                    'pipeline_user' => $this->request->getPost('pipeline_user'),
                       
                                
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];


                $aadhar   = $this->request->getPost('aadhar_no');
                $passport = $this->request->getPost('passport_no');


                if (empty($aadhar) && empty($passport)) {
                    session()->setFlashdata('message_danger', 'Please enter either Aadhaar Number or Passport Number.');
                    return redirect()->back()->withInput();
                }
                $croppedImage = $this->request->getPost('cropped_image');
                $image = null;
                
                if (!empty($croppedImage)) {
                    $image = $this->upload_base64_image('students', $croppedImage);
                }
                
                if ($image && valid_file($image['file'])) {
                    $data['image'] = $image['file'];
                }
                
                $user_id = $this->applications_model->add($data);
                if ($user_id) 
                {
                    $_SESSION['student_id'] = $user_id;
                    session()->setFlashdata('message_success', "Student Application Added Successfully!");
                } else {
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            } else {
                session()->setFlashdata('message_danger', "User Already Existed With This Email Or Phone Number!");
                return redirect()->to(base_url('admin/applications/add'));
            }

            return redirect()->to(base_url('admin/applications/add?active=2'));
        }

        $this->data['countries'] = $this->country_model->get([], ['country_id', 'country'])->getResultArray();
        $this->data['batch'] = $this->batch_model->get(['status' => 1], ['id', 'title'])->getResultArray();
        $this->data['course'] = $this->course_model->get([], ['title', 'id'])->getResultArray();
        $this->data['language'] = $this->languages_model->get([], ['title', 'id'])->getResultArray();
        $this->data['country_code'] = get_country_code();
        $this->data['pipeline_users'] = [];
        $this->data['activeTab'] = $this->request->getGet('active') ? $this->request->getGet('active') : '1'; 

        $lastRow = $this->applications_model->get([], [], ['id', 'desc'])->getRow();

        if (!empty($lastRow)) {
            $lastId = (int) $lastRow->id; // Get the latest ID
            $nextId = $lastId + 1;

            // Format: TTII + YY + 4-digit padded number (e.g. TTII250035)
            $this->data['application_id'] = 'TTII' . date('y') . str_pad($nextId, 4, '0', STR_PAD_LEFT);
        } else {
            // If no records yet, start at 1
            $this->data['application_id'] = 'TTII' . date('y') . str_pad(1, 4, '0', STR_PAD_LEFT);
        }

                
        $this->data['enrol_data'] = [];
        
        if(!empty($_SESSION['student_id']))
        {
            $id = $_SESSION['student_id'];
            $this->data['payments'] = $this->student_fee_model->get(['user_id' => $id])->getResultArray();

            $this->data['edit_data'] = $this->applications_model->get(['id' => $id])->getRowArray();
                
            $this->data['qualifications']  = $this->qualification_model->get(['user_id' => $id])->getRowArray();

              if (!empty($this->data['edit_data']['course_id'])) {
                $this->data['course_details'] = $this->course_model->get(
                    ['id' => $this->data['edit_data']['course_id']],
                    ['fee_structure', 'title', 'total_amount']
                )->getRowArray();
            
                $paid = 0;
                if (!empty($this->data['payments'])) {
                    foreach ($this->data['payments'] as $payment) {
                        if ($payment['status'] === 'Paid') {
                            $paid += $payment['amount'];
                        }
                    }
                }
            
                $this->data['course_details']['paid_amount'] = $paid;
                $this->data['course_details']['pending_amount'] = $this->data['course_details']['total_amount'] - $paid;
            } 

            // $this->data['edit_data']['pipeline'] = '';
            // $this->data['edit_data']['pipeline_user'] = '';
            // $role_id = get_role_id();
            // $this->data['pipeline_readonly'] = false;
            // if($role_id == '9') {
            //     $this->data['edit_data']['pipeline'] = 'counsellor';
            //     $this->data['edit_data']['pipeline_user'] = get_user_id();
            //     $this->data['pipeline_readonly'] = true;
            // }
            // elseif($role_id == '10'){
            //     $this->data['edit_data']['pipeline'] = 'associates';
            //     $this->data['edit_data']['pipeline_user'] = get_user_id();
            //     $this->data['pipeline_readonly'] = true;
            // }

        }else{
            $this->data['qualifications'] = [];
            $this->data['course_details'] = [];
            $this->data['payments'] = [];
            $this->data['edit_data'] = [];
            // $role_id = get_role_id();
            // $this->data['edit_data']['pipeline'] = '';
            // $this->data['edit_data']['pipeline_user'] = '';
            // $this->data['pipeline_readonly'] = false;
            // if($role_id == '9') {
            //     $this->data['edit_data']['pipeline'] = 'counsellor';
            //     $this->data['edit_data']['pipeline_user'] = get_user_id();
            //     $this->data['pipeline_readonly'] = true;
            // }
            // elseif($role_id == '10'){
            //     $this->data['edit_data']['pipeline'] = 'associates';
            //     $this->data['edit_data']['pipeline_user'] = get_user_id();
            //     $this->data['pipeline_readonly'] = true;
            // }
        }
        
        // echo "<pre>";
        // print_r($_SESSION); exit();
        
        
        //log_message('error',print_r($this->data,true));
        $this->data['page_title'] = 'Add Applications';
        $this->data['page_name'] = 'Applications/add';
        return view('Admin/index', $this->data);
    }
    
     public function add_education()
    {
        $id = $this->request->getPost('user_id');

        if ($this->request->getMethod() === 'post') 
        {
             $student_data = [
                'highest_qualification' => $this->request->getPost('highest_qualification'),
                'previous_school' => $this->request->getPost('previous_school'),
                'year_of_passing' => $this->request->getPost('year_of_passing'),
                'percentage_or_grade' => $this->request->getPost('percentage_grade'),
                'teaching_experience' => $this->request->getPost('teaching_experience'),
                
                'employment_status' => $this->request->getPost('employment_status'),
                'organization_name' => $this->request->getPost('organization_name'),
                'designation' => $this->request->getPost('designation'),
                'experience_years' => $this->request->getPost('experience_years'),
                'industry_sector' => $this->request->getPost('industry_sector'),
                
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            
            
            $update_student = $this->user_details_model->edit($student_data, ['user_id' => $id]);
           
            if ($update_student) 
            {
                    $qualifications = $this->request->getPost('qualification');
                    $boards = $this->request->getPost('board');
                    $percentages = $this->request->getPost('percentage');
                    $files = $this->request->getFiles(); // Retrieve all files
                    $update_successful = true;
            
                    foreach ($qualifications as $key => $qualification) {
                        $data = [
                            'user_id' => $id,
                            'qualification'=> $qualifications[$key],
                            'board' => $boards[$key],
                            'percentage' => $percentages[$key],
                            'updated_at' => date('Y-m-d H:i:s'),
                            'updated_by' => get_user_id(),
                        ];
            
                        // Handle certificate upload
                        if (isset($files['certificate'][$key]) && $files['certificate'][$key]->isValid()) {
                            $uploadedCertificate = $this->custom_upload_file('certificates', $files['certificate'][$key]);
            
                            if ($uploadedCertificate && isset($uploadedCertificate['file'])) {
                                $data['certificate'] = $uploadedCertificate['file'];
                            }
                        }
            
                        // Handle marksheet upload
                        if (isset($files['marksheet'][$key]) && $files['marksheet'][$key]->isValid()) {
                            $uploadedMarksheet = $this->custom_upload_file('marksheets', $files['marksheet'][$key]);
            
                            if ($uploadedMarksheet && isset($uploadedMarksheet['file'])) {
                                $data['marksheet'] = $uploadedMarksheet['file'];
                            }
                        }
            
                        // Update the qualification record
                        $update_result = $this->qualification_model->add($data);
            
                        // if (!$update_result) {
                        //     $update_successful = false;
                        //     break;
                        // }
                    }

                
                 return redirect()->to(base_url('admin/applications/add?active=3'));
                session()->setFlashdata('message_success', "Student Education Added Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        
        } else {
            session()->setFlashdata('message_danger', "User Already Existed");
        }

        return redirect()->to(base_url('admin/applications/index'));
 
    }
    
    public function edit_education($id)
    {
        $student_data = [
            'highest_qualification' => $this->request->getPost('highest_qualification'),
            'previous_school' => $this->request->getPost('previous_school'),
            'year_of_passing' => $this->request->getPost('year_of_passing'),
            'percentage_or_grade' => $this->request->getPost('percentage_grade'),
            'teaching_experience' => $this->request->getPost('teaching_experience'),
            
            'employment_status' => $this->request->getPost('employment_status'),
            'organization_name' => $this->request->getPost('organization_name'),
            'designation' => $this->request->getPost('designation'),
            'experience_years' => $this->request->getPost('experience_years'),
            'industry_sector' => $this->request->getPost('industry_sector'),
            
            'updated_by' => get_user_id(),
            'updated_at' => date('Y-m-d H:i:s'),
        ];
        
        
        $update_student = $this->applications_model->edit($student_data, ['id' => $id]);
       
        if ($update_student) 
        {
                $qualifications = $this->request->getPost('qualification');
                $boards = $this->request->getPost('board');
                $percentages = $this->request->getPost('percentage');
                $files = $this->request->getFiles(); // Retrieve all files
                $update_successful = true;
        
                foreach ($qualifications as $key => $qualification) {
                    $data = [
                        'user_id' => $id,
                        'qualification'=> $qualifications[$key],

                        'board' => $boards[$key],
                        'percentage' => $percentages[$key],
                        'updated_at' => date('Y-m-d H:i:s'),
                        'updated_by' => get_user_id(),
                    ];
        
                    // Handle certificate upload
                    if (isset($files['certificate'][$key]) && $files['certificate'][$key]->isValid()) {
                        $uploadedCertificate = $this->custom_upload_file('certificates', $files['certificate'][$key]);
        
                        if ($uploadedCertificate && isset($uploadedCertificate['file'])) {
                            $data['certificate'] = $uploadedCertificate['file'];
                        }
                    }
        
                    // Handle marksheet upload
                    if (isset($files['marksheet'][$key]) && $files['marksheet'][$key]->isValid()) {
                        $uploadedMarksheet = $this->custom_upload_file('marksheets', $files['marksheet'][$key]);
        
                        if ($uploadedMarksheet && isset($uploadedMarksheet['file'])) {
                            $data['marksheet'] = $uploadedMarksheet['file'];
                        }
                    }
                    
                    $check_quali = $this->qualification_model->get(['user_id' => $id,'qualification'=>$qualification])->getResultArray();
                    
                    if(empty($check_quali))
                    {
                         // Update the qualification record
                        $update_result = $this->qualification_model->add($data);
                    
                    }
                    else
                    {
                         $update_result = $this->qualification_model->edit($data, [
                        'user_id' => $id,
                        'qualification' => $qualification,
                        ]);
                        
                        if (!$update_result) {
                            $update_successful = false;
                            break;
                        }
                    }
                
                }

            
             return redirect()->to(base_url('admin/applications/edit/'.$id.'?active=3'));
            session()->setFlashdata('message_success', "Education Added Successfully!");
        } 
        else 
        {
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
            
        return redirect()->to(base_url('admin/applications/index'));
     
    }
    
    
    public function edit($id)
    {
        if ($this->request->getMethod() === 'post') 
        {
            
            $name = ucfirst($this->request->getPost('name'));
            $code = $this->request->getPost('code');
            $phone = $this->request->getPost('phone');

            
            $check_phone_duplication = $this->applications_model
                ->get(['country_code' => $code, 'phone' => $phone, 'id !=' => $id])->getNumRows();

            $check_email_duplication = $this->applications_model
                ->get(['email' => $this->request->getPost('email'), 'id !=' => $id])->getNumRows();

            if ($check_phone_duplication == 0 && $check_email_duplication == 0) 
            {
                $data = [
                    'application_id' => $this->request->getPost('application_id'),
                    'name' => $this->request->getPost('name'),
                    'country_code' => $this->request->getPost('code'),
                    'phone' => $this->request->getPost('phone'),
                    'email' => $phone,
                    'user_email' => $this->request->getPost('email'),
                
                    'date_of_birth' => $this->request->getPost('DOB'),
                    'age' => $this->request->getPost('age'),
                    'gender' => $this->request->getPost('gender'),
                    'nationality' => $this->request->getPost('nationality'),
                    'marital_status' => $this->request->getPost('marital_status'),
                    'aadhar_no' => $this->request->getPost('aadhar_no'),
                    'passport_no' => $this->request->getPost('passport_no'),
                    'whatsapp_no' => $this->request->getPost('whatsapp_no'),
                    'second_code' => $this->request->getPost('second_code'),
                    'second_phone' => $this->request->getPost('second_phone'),
                    'country_id' => $this->request->getPost('country_id'),
                    'district' => $this->request->getPost('district'),
                    'state' => $this->request->getPost('state'),
                    'address' => $this->request->getPost('address'),
                    'native_address' => $this->request->getPost('native_address'),
                        
                    'father_name' => $this->request->getPost('father_name'),
                    'mother_name' => $this->request->getPost('mother_name'),
                    'guardian_name' => $this->request->getPost('guardian_name'),
                    'emergency_name' => $this->request->getPost('emergency_name'),
                    'emergency_phone' => $this->request->getPost('emergency_phone'),
                    'emergency_relation' => $this->request->getPost('emergency_relation'),

                    'learning_disabilities' => $this->request->getPost('learning_disabilities'),
                    'accessibility_needs' => $this->request->getPost('accessibility_needs'),
                    'marketing_source' => $this->request->getPost('marketing_source'),
                    // 'pipeline' => $this->request->getPost('pipeline'),
                    // 'pipeline_user' => $this->request->getPost('pipeline_user'),
                                
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];

                $croppedImage = $this->request->getPost('cropped_image');
                $image = null;
                
                if (!empty($croppedImage)) {
                    $image = $this->upload_base64_image('students', $croppedImage);
                }
                
                if ($image && valid_file($image['file'])) {
                    $data['image'] = $image['file'];
                }

                $details = $this->applications_model->get(['id' => $id])->getResultArray();


                if(!empty($details))
                {
                    $student_result = $this->applications_model->edit($data, ['id' => $id]);
                }
                else
                {
                    $student_result = $this->applications_model->add($data);
                }


                if ($student_result) {
                    session()->setFlashdata('message_success', "Student Updated Successfully!");
                } else {
                    session()->setFlashdata('message_danger', "Something went wrong while updating student details! Try Again");
                }
               
            } else {
                session()->setFlashdata('message_danger', "Phone or Email Already Exists");
            }
            return redirect()->to(base_url('admin/applications/edit/' . $id .'?active=2'));
        } 
        else 
        {
            $this->data['edit_data'] = $this->applications_model->get(['applications.id' => $id],[] )->getRowArray();
         
         
            $this->data['batch'] = $this->batch_model->get(['status' => 1], ['id', 'title'])->getResultArray();

            $this->data['payments'] = $this->student_fee_model->get(['user_id' => $id])->getResultArray();

            $this->data['country_code'] = get_country_code();

            $this->data['countries'] = $this->country_model->get([], ['country_id', 'country'])->getResultArray();
            $this->data['course'] = $this->course_model->get([], ['title', 'id'])->getResultArray();
            $this->data['language'] = $this->languages_model->get([], ['title', 'id'])->getResultArray();

            $courses = $this->course_model->get()->getResultArray();
            $this->data['courses'] = array_column($courses, 'title', 'id');
            
            if (!empty($this->data['edit_data']['course_id'])) {
                $this->data['course_details'] = $this->course_model->get(
                    ['id' => $this->data['edit_data']['course_id']],
                    [ ]
                )->getRowArray();
            
                $paid = 0;
                if (!empty($this->data['payments'])) {
                    foreach ($this->data['payments'] as $payment) {
                        if ($payment['status'] === 'Paid') {
                            $paid += $payment['amount'];
                        }
                    }
                }
                
                $this->data['qualification'] = $this->qualification_model->get(['user_id' => $id])->getResultArray();

            
                $this->data['course_details']['paid_amount'] = $paid;
                $this->data['course_details']['pending_amount'] = $this->data['course_details']['total_amount'] - $paid;
            } 


            $this->data['activeTab'] = $this->request->getGet('active') ? $this->request->getGet('active') : '1'; 

            $this->data['documents'] = $this->student_document_model->get(['student_id' => $id])->getResultArray();

            $this->data['page_title'] = 'Update Application';
            $this->data['page_name'] = 'Applications/add';
            
            // $role_id = get_role_id();
            // $this->data['edit_data']['pipeline'] = '';
            // $this->data['edit_data']['pipeline_user'] = '';
            // $this->data['pipeline_readonly'] = false;
            // if($role_id == '9') {
            //     $this->data['edit_data']['pipeline'] = 'counsellor';
            //     $this->data['edit_data']['pipeline_user'] = get_user_id();
            //     $this->data['pipeline_readonly'] = true;
            // }
            // elseif($role_id == '10'){
            //     $this->data['edit_data']['pipeline'] = 'associates';
            //     $this->data['edit_data']['pipeline_user'] = get_user_id();
            //     $this->data['pipeline_readonly'] = true;
            // }


            // print_r($this->data['edit_data']['password']); exit();

            return view('Admin/index', $this->data);
        }
    }
    

    public function edit_info($id)
    {
        if ($this->request->getMethod() === 'post') {
            helper('encryption');
            $data = [
                'username' => $this->request->getPost('username'),
                'password' => $this->request->getPost('password'),                             
                'student_id' => $this->request->getPost('student_id'),
                //'phone' => $this->request->getPost('phone'),
                //'email' => $this->request->getPost('code') . $this->request->getPost('phone'),
                'biography' => $this->request->getPost('biography'),
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];

            $response = $this->applications_model->edit($data, ['id' => $id]);

            if ($response) {
                session()->setFlashdata('message_success', "Student Updated Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }

        return redirect()->to(base_url('admin/applications/index'));
    }

    public function ajax_view($id)
    {
        $this->data['view_data'] = $this->applications_model->get(['id' => $id])->getRowArray();
        echo view('admin/applications/ajax_view', $this->data);
    }
    
    
    
    public function view($id)
    {
        $this->data['view_data'] = $this->applications_model->get_join(
            [
                ['course', 'course.id = applications.course_id','left'],
                ['batch', 'batch.id = applications.batch_id','left'],
                ['languages', 'languages.id = applications.preferred_language','left'],
                ['centres', 'centres.id = applications.added_under_centre','left'],
            ],
            ['applications.id' => $id],
            [
                'applications.*','course.title as course_title','batch.title as batch_title','languages.title as language_title','enrollment_status','mode_of_study','centres.centre_name as centre_name'
            ]
        )->getRowArray();
        $countries = get_country_code();

        if (isset($this->data['view_data']['country_code']) && 
            isset($countries[$this->data['view_data']['country_code']])) {
            
            $this->data['view_data']['country'] = $countries[$this->data['view_data']['country_code']];
        } else {
            $this->data['view_data']['country'] = null; // or "Unknown"
        }
        
        $this->applications_model->get(['id' => $id])->getRowArray();

        $this->data['documents'] = $this->student_document_model->get(['student_id' => $id])->getResultArray();
        



        // echo "<pre>";
        // print_r($this->data['enrol_data']); exit();
        $this->data['qualification'] = $this->qualification_model->get(['user_id' => $id])->getResultArray();

        $this->data['page_title'] = 'View Applications';
        $this->data['page_name'] = 'Applications/view';
        return view('Admin/index', $this->data);
    }
    
    
    public function convert($id)
    {

        if ($id > 0) 
        {
            $application_data = $this->applications_model->get(['id' => $id])->getRowArray();
            // print_r($application_data); exit;
            
            $centre_id = $application_data['added_under_centre'];

            if (!empty($centre_id)) {

                $centre_data = $this->centres_model
                                    ->get(['id' => $centre_id])
                                    ->getRowArray();

                if (empty($application_data['course_id'])) {
                    session()->setFlashdata('message_danger', "Please enrol course first for centre based application!");
                    return redirect()->to(base_url('admin/applications/index'));
                }

                $check_assigned_course = $this->centre_course_plans_model
                                                ->get([
                                                    'centre_id' => $centre_data['id'],
                                                    'course_id' => $application_data['course_id']
                                                ])
                                                ->getRowArray();

                if (!empty($check_assigned_course)) {

                    $assigned_amount = $check_assigned_course['assigned_amount'];
                    $wallet_balance  = $centre_data['wallet_balance'] ?? 0;

                    //  Check wallet balance
                    if ($wallet_balance < $assigned_amount) {
                        session()->setFlashdata('message_danger', "Centre wallet has insufficient balance!");
                        return redirect()->to(base_url('admin/applications/index'));
                    }
                    if(date('Y-m-d', strtotime($check_assigned_course['end_date'])) < date('Y-m-d')) {
                        session()->setFlashdata('message_danger', "Centre Course Plan has been expired!");
                    }
                    $db = \Config\Database::connect();
                    $db->transBegin();

                    try {

                        // 1. Deduct wallet balance
                        $new_balance = $wallet_balance - $assigned_amount;

                        $this->centres_model->edit([
                            'wallet_balance' => $new_balance,
                            'updated_at'     => date('Y-m-d H:i:s'),
                            'updated_by'     => get_user_id()
                        ], ['id'=> $centre_data['id']] );

                        // 2. Insert wallet transaction
                        $this->wallet_transactions_model->add([
                            'centre_id'        => $centre_data['id'],
                            'transaction_type' => 'debit',
                            'amount'           => $assigned_amount,
                            'remarks'          => 'Application Converted To Student: '.$application_data['name'],
                            'created_at'        => date('Y-m-d H:i:s'),
                            'created_by'        => get_user_id()
                        ]);

                        // Commit transaction
                        if ($db->transStatus() === FALSE) {
                            throw new \Exception('Transaction Failed');
                        }

                        $db->transCommit();

                    } catch (\Throwable $e) {

                        $db->transRollback();
                        session()->setFlashdata('message_danger', "Wallet deduction failed!");
                        return redirect()->to(base_url('admin/applications/index'));
                    }
                }
            }

            if(!empty($application_data))
            {
                $data = [
                    'name' => $application_data['name'],
                    'country_code' => $application_data['country_code'],
                    'phone' => $application_data['phone'],
                    'email' => $application_data['country_code'].$application_data['phone'],
                    'user_email' => $application_data['user_email'],
                    'username' => $application_data['username'],
                    'password' => $this->users_model->password_hash($application_data['password']),
                    'role_id' => 2,
                    'course_id' =>$application_data['course_id'],
                    'application_id' => $application_data['id'],
                    'profile_picture' => $application_data['image'],
                    'added_under_centre' => $application_data['added_under_centre'],
                    'created_by' => get_user_id(),
                    'updated_by' => get_user_id(),
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
                
                $previousId  = $this->users_model->get(['role_id' => 2],[],['id'=>'desc'])->getRow();
                //log_message('error', '$previousId : '.print_r($previousId,true));

                $lastId  = $this->users_model->add($data);
                //
                
                
                if($lastId > 0 && !empty($previousId))
                {

                    $num = (int) filter_var($previousId->student_id, FILTER_SANITIZE_NUMBER_INT);

                    // $num = (int)substr($lastId->student_id ?? 0, 2); // Extract numeric part: 2
                    log_message('error', '$num : '.print_r($num,true));
                    $nextNum = $num + 1; // Increment: 3
                    log_message('error', '$nextNum : '.print_r($nextNum,true));
                    $data['student_id'] = 'TTS' . str_pad($nextNum, 4, '0', STR_PAD_LEFT); // Format: TT0003
                    log_message('error', '$data : '.print_r($data['student_id'],true));
                    

                    $this->send_application_mail($application_data);
                    $this->send_login_credentials_email($application_data);
                    $user_id = $this->users_model->edit($data, ['id' => $lastId]);
                }
                else
                {
                    $data['student_id'] = 'TTS' . str_pad(1, 4, '0', STR_PAD_LEFT); // Format: TT0003
                    log_message('error', '$data from else part: '.print_r($data['student_id'],true));  
                    $user_id = $this->users_model->edit($data, ['id' => $lastId]); 
                }

                
                // if($lastId)
                // {
                //     $this->send_application_mail($application_data);
                //     $this->send_login_credentials_email($application_data);
                //     $num = (int)$lastId; // Extract numeric part: 2
                //     $nextNum = $num + 1; // Increment: 3
                //     $data['student_id'] = $application_data['application_id'];
                //     // $data['student_id'] = 'TTS' . str_pad($nextNum, 4, '0', STR_PAD_LEFT); // Format: TT0003
                //     $user_id = $this->users_model->edit($data, ['id' => $lastId]);
                // }
                // else
                // {
                //     $data['student_id'] = $application_data['application_id'];
                //     // $data['student_id'] = 'TTS' . str_pad(1, 4, '0', STR_PAD_LEFT); // Format: TT0003
                //     $user_id = $this->users_model->edit($data, ['id' => $lastId]);
                // }
                
                // $user_id = $this->users_model->add($data);
                
                if($lastId)
                {
                    $student_data = [
                        'user_id' => $lastId,
                        'date_of_birth' => $application_data['date_of_birth'],
                        'age' => $application_data['age'],
                        'gender' => $application_data['gender'],
                        'nationality' => $application_data['nationality'],
                        'marital_status' => $application_data['marital_status'],
                        'aadhar_no' => $application_data['aadhar_no'],
                        'passport_no' => $application_data['passport_no'],
                        'whatsapp_no' => $application_data['whatsapp_no'],
                        'second_code' => $application_data['second_code'],
                        'second_phone' => $application_data['second_phone'],
                        'country_id' => $application_data['country_id'],
                        'district' => $application_data['district'],
                        'state' => $application_data['state'],
                        'address' => $application_data['address'],
                        'native_address' => $application_data['native_address'],
                        
                        'father_name' => $application_data['father_name'],
                        'mother_name' => $application_data['mother_name'],
                        'guardian_name' => $application_data['guardian_name'],
                        'emergency_name' => $application_data['emergency_name'],
                        'emergency_phone' => $application_data['emergency_phone'],
                        'emergency_relation' => $application_data['emergency_relation'],

                        'learning_disabilities' => $application_data['learning_disabilities'],
                        'accessibility_needs' => $application_data['accessibility_needs'],
                        'marketing_source' => $application_data['marketing_source'],
                        
                        
                        'highest_qualification' => $application_data['highest_qualification'],
                        'previous_school' => $application_data['previous_school'],
                        'year_of_passing' => $application_data['year_of_passing'],
                        'percentage_or_grade' => $application_data['percentage_or_grade'],
                        'teaching_experience' => $application_data['teaching_experience'],
                        
                        'employment_status' => $application_data['employment_status'],
                        'organization_name' => $application_data['organization_name'],
                        'designation' => $application_data['designation'],
                        'experience_years' => $application_data['experience_years'],
                        'industry_sector' => $application_data['industry_sector'],
                       
                        
                        'created_by' => get_user_id(),
                        'created_at' => date('Y-m-d H:i:s')
                    ];
                    
                    $student_id = $this->user_details_model->add($student_data);
                    
                    if($application_data['course_id'] > 0){
                        $enroldata = [
                            'course_id' => $application_data['course_id'],
                            'user_id' => $lastId,
                            'batch_id' => $application_data['batch_id'],
                            'enrollment_date' => $application_data['enrollment_date'],
                            'enrollment_status' => $application_data['enrollment_status'],
                            'mode_of_study' => $application_data['mode_of_study'],
                            'preferred_language' => $application_data['preferred_language'],
                            'pipeline' => $application_data['pipeline'],
                            'pipeline_user' => $application_data['pipeline_user'],
                            'created_by' => get_user_id(),
                            'updated_by' => get_user_id(),
                            'created_at' => date('Y-m-d H:i:s'),
                            'updated_at' => date('Y-m-d H:i:s'),
                        ];

                        // 
                        $course_short_name = $this->course_model->get(['id' => $application_data['course_id']])->getRowArray()['short_name'];
                        // Date part
                        $date_part = date('ym'); // YYmm format, e.g., 2508

                        // Serial number: count total enrolments +1
                        $total_enrolments = $this->enrol_model->get()->getNumRows(); // total rows in enrol table
                        $serial = str_pad($total_enrolments + 1, 4, '0', STR_PAD_LEFT); // 4-digit serial

                        // Final enrollment ID
                        $enrollment_id = 'TI'.strtoupper($course_short_name).$date_part.$serial;
                        $enroldata['enrollment_id'] = $enrollment_id;
                        $enrol = $this->enrol_model->add($enroldata);
                    }
                    
                    
           
                }
                
                    $updatedata = ['status' => 'converted','is_converted' => 1,'converted_by' => get_user_id(),'converted_at' => date('Y-m-d H:i:s'),
                    'updated_by' => get_user_id(), 'updated_at' => date('Y-m-d H:i:s')];
                     $this->applications_model->edit($updatedata, ['id' => $id]);
                

            }
          

        } 
        else 
        {
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }

        return redirect()->to(base_url('admin/students/index'));
    }


    public function reject_application($id){
        $updatedata = ['status' => 'rejected','updated_by' => get_user_id(), 'updated_at' => date('Y-m-d H:i:s')];
        $this->applications_model->edit($updatedata, ['id' => $id]);
        session()->setFlashdata('message_success', "Application Rejected Successfully!");
        return redirect()->to(base_url('admin/applications/index'));
    }
    
    
    private function send_application_mail($user)
    {
        $course_name = $user['course_id'] != '' ? $this->course_model->get(['id' => $user['course_id']], ['title'])->getRow()->title ?? '' : '';
        $subject = 'Your Admission Has Been Confirmed - Teachers\' Training Institute of India';

        $toEmail = $user['user_email'];
        $toName = $user['name'];

        $loginUrl = base_url('login/index');

        $bodyContent = <<<EOD
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <title>Welcome to Your Cohort – Teachers' Training Institute of India</title>
                    </head>
                    <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height:1.6; color:#2d3748; background-color:#f7fafc; margin:0; padding:0;">
                        <div style="max-width:650px; margin:20px auto; background:#fff; overflow:hidden;">
                            <div style="height:5px; background:linear-gradient(to right,#8B5CF6,#0a875c,#8B5CF6);"></div>
                            
                            <div style="padding:60px 40px 40px; background:#fff;">
                                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:30px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
                                    <p>Dear {$toName},</p>
                                    <br>
                                    <p>🎉 Congratulations! Your application for the <strong>{$course_name}</strong> has been approved, and your student account has been successfully created on our Learning Management System.</p>
                                    <br>
                                    <p>You can now log in to access your courses and learning resources using your <strong>phone number</strong>.</p>
                                    
                                    <div style="background:#f8faf9; padding:20px; border-radius:12px; margin:20px 0; border-left:4px solid #8B5CF6;">
                                        <h3 style="font-size:18px; font-weight:600; color:#2d3748; margin-bottom:15px;">Account Access:</h3>
                                        <div style="margin:10px 0; font-size:15px;">
                                            • <strong style="color:#2d3748;">Login URL:</strong> 
                                            <a href="{$loginUrl}" style="color:#8B5CF6; text-decoration:none;">Click Here to Login</a>
                                        </div>
                                    </div>

                                    <div style="text-align:center;">
                                        <a href="{$loginUrl}" style="display:inline-block; background:#8B5CF6; color:#fff; padding:12px 30px; text-decoration:none; border-radius:8px; font-weight:600; margin:20px 0;">Go to Login Page</a>
                                    </div>

                                    <p>If you have any questions, contact us at 
                                        <a href="mailto:support@teachersindia.in" style="color:#8B5CF6;">support@teachersindia.in</a>.
                                    </p>
                                    <br>
                                    <p>We look forward to supporting your learning journey.</p>
                                </div>
                            </div>

                            <div style="background:#f8faf9; padding:30px; text-align:center; border-top:1px solid #e2e8f0;">
                                <p style="color:#718096; font-size:14px; margin:5px 0;">Best regards,<br><strong>Teachers' Training Institute of India</strong></p>
                                <div style="width:60px; height:2px; background:rgba(237,119,29,0.3); margin:15px auto;"></div>
                                <p style="color:#718096; font-size:14px; margin:5px 0;">© 2025 Teachers' Training Institute of India</p>
                                <p style="color:#718096; font-size:14px; margin:5px 0;">This email was sent to {$toEmail}</p>
                            </div>
                        </div>
                    </body>
                    </html>
                    EOD;





        send_email_message($toEmail, $toName, $subject, $bodyContent, 'Teachers’ Training Institute of India');
    }
    
     private function send_login_credentials_email($user)
    {

        $course_name = $user['course_id'] != '' ? $this->course_model->get(['id' => $user['course_id']], ['title'])->getRow()->title ?? '' : '';
        $subject = 'Your Admission Has Been Confirmed – Teachers\' Training Institute of India';

        $toEmail = $user['user_email'];
        $toName = $user['name'];
        
        // Get the newly created user data with login credentials
        $new_user = $this->users_model->get(['user_email' => $user['user_email']])->getRowArray();
        $application_data = $this->applications_model->get(['id' => $user['id']])->getRowArray();
        $username = $new_user['phone'] ?? $new_user['user_email'] ?? '';
        $password = $application_data['password'] ?? '';
        $this->applications_model->edit(['password' => null], ['id' => $user['id']]);

        $bodyContent = "<!DOCTYPE html>
            <html lang=\"en\">
            <head>
                <meta charset=\"UTF-8\">
                <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                <title>Your Admission Has Been Confirmed</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        line-height: 1.6;
                        color: #2d3748;
                        background-color: #f7fafc;
                    }
                    .email-container {
                        max-width: 650px;
                        margin: 20px auto;
                        background: #ffffff;
                        overflow: hidden;
                    }
                    .top-accent {
                        height: 5px;
                        background: linear-gradient(to right, #8B5CF6, #0a875c, #8B5CF6);
                    }
                    .header {
                        position: relative;
                        padding: 10px;
                        text-align: center;
                        background: white;
                    }
                    .header::after {
                        content: '';
                        position: absolute;
                        bottom: 0;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 60px;
                        height: 2px;
                        background: rgba(237,119,29,0.3);
                    }
                    .logo-wrapper {
                        padding: 20px 40px;
                        background: white;
                        text-align: center;
                    }
                    .logo {
                        max-width: 150px;
                        height: auto;
                    }
                    .content {
                        padding: 50px 40px 20px;
                        background: white;
                    }
                    .notification-card {
                        background: #ffffff;
                        border-radius: 12px;
                        padding: 30px;
                        margin-bottom: 30px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                        border: 1px solid #e2e8f0;
                    }
                    .message-content {
                        color: #2d3748;
                        font-size: 16px;
                        line-height: 1.7;
                    }
                    .message-content h2 {
                        color: #0a875c;
                        font-size: 24px;
                        margin-bottom: 20px;
                        text-align: center;
                    }
                    .message-content p {
                        margin-bottom: 15px;
                    }
                    .login-details {
                        background: #f8faf9;
                        padding: 25px;
                        border-radius: 8px;
                        margin: 25px 0;
                        border-left: 4px solid #0a875c;
                    }
                    .login-details h3 {
                        color: #0a875c;
                        margin: 0 0 15px 0;
                        font-size: 18px;
                    }
                    .login-details p {
                        margin: 8px 0;
                        font-size: 16px;
                    }
                    .login-details strong {
                        color: #2d3748;
                    }
                    .login-button {
                        display: inline-block;
                        background: linear-gradient(135deg, #0a875c, #10b981);
                        color: white;
                        padding: 15px 35px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 600;
                        margin: 20px 0;
                        transition: background-color 0.3s;
                    }
                    .login-button:hover {
                        background: linear-gradient(135deg, #065f46, #059669);
                    }
                    .footer {
                        background: #f8faf9;
                        padding: 30px;
                        text-align: center;
                        border-top: 1px solid #e2e8f0;
                    }
                    .footer-text {
                        color: #718096;
                        font-size: 14px;
                        margin: 5px 0;
                    }
                    .divider {
                        width: 60px;
                        height: 2px;
                        background: rgba(237,119,29,0.3);
                        margin: 15px auto;
                    }
                    @media only screen and (max-width: 600px) {
                        .email-container {
                            margin: 0;
                        }
                        .header, .content {
                            padding: 20px;
                        }
                        .logo-wrapper {
                            padding: 15px 30px;
                        }
                        .notification-card {
                            padding: 20px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class=\"email-container\">
                    <div class=\"top-accent\"></div>
                    
                    <div class=\"content\">
                        <div class=\"notification-card\">
                            <div class=\"message-content\">
                                <h2>🎉 Congratulations!</h2>
                                <p>Dear {$toName},</p>
                                <br>
                                <p>Your application for the <strong>{$course_name}</strong> has been approved, and your student account has been successfully created on our Learning Management System.</p>

                                <p>You can now log in to access your courses and other learning resources.</p>
                                
                                <div class=\"login-details\">
                                    <h3>🔐 Login Details:</h3>
                                    <p><strong>Username:</strong> {$username}</p>
                                    <p><strong>Password:</strong> {$password}</p>
                                </div>

                                <p>Please log in using the link below and change your password to secure your account.</p>

                                <br>
                                <div style=\"text-align: center;\">
                                    <a href=\"" . base_url('login/index') . "\" class=\"login-button\">Login to Your Account</a>
                                </div>
                                <br>
                                <p>If you have any questions or need assistance, feel free to contact us at <a href=\"mailto:support@teachersindia.in\" style=\"color: #0a875c;\">support@teachersindia.in</a>.</p>
                                <br>
                                <p>We look forward to supporting your learning journey.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class=\"footer\">
                        <p class=\"footer-text\">Best regards,<br><strong>Teachers' Training Institute of India</strong></p>
                        <div class=\"divider\"></div>
                        <p class=\"footer-text\">© 2025 Teachers' Training Institute of India</p>
                        <p class=\"footer-text\">This email was sent to {$toEmail}</p>
                    </div>
                </div>
            </body>
            </html>";

        send_email_message($toEmail, $toName, $subject, $bodyContent, 'Teachers\' Training Institute of India');

    }
    public function delete($id)
    {
        if ($id > 0) {
            $enrol_data = $this->enrol_model->get(['user_id' => $id])->getNumRows();
            $payment_data = $this->payment_model->get(['user_id' => $id])->getNumRows();

            if ($payment_data > 0) {
                session()->setFlashdata('message_danger', "You Cant Delete Student! Payment exists for student");
            } elseif ($enrol_data > 0) {
                session()->setFlashdata('message_danger', "You Cant Delete Student! Enrolled in course");
            } elseif ($this->applications_model->remove(['id' => $id])) {
                
                session()->setFlashdata('message_success', "Student Deleted Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        } else {
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }

        return redirect()->to(base_url('admin/applications/index'));
    }

    public function enrol($id)
    {
        $this->data['student'] = $id;
        $this->data['course'] = $this->course_model->get()->getResultArray();

        echo view('admin/applications/enrol', $this->data);
    }

    public function enrol_course($id)
    {
        if ($this->request->getMethod() === 'post') 
        {
            $course_id  = $this->request->getPost('course');
            
            $data = [
                'course_id' => $this->request->getPost('course'),
                'batch_id' => $this->request->getPost('batch_id'),
                'enrollment_date' => $this->request->getPost('enrollment_date'),
                'enrollment_status' => $this->request->getPost('enrollment_status') ?? 'Active',
                'mode_of_study' => $this->request->getPost('mode_of_study'),
                'preferred_language' => $this->request->getPost('preferred_language'),
                'pipeline' => $this->request->getPost('pipeline'),
                'pipeline_user' => $this->request->getPost('pipeline_user'),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];

            $role_id = get_role_id();
            if($role_id == '9') {
                $data['pipeline'] = 'counsellor';
                $data['pipeline_user'] = get_user_id();
            }
            elseif($role_id == '10'){
                $data['pipeline'] = 'associates';
                $data['pipeline_user'] = get_user_id();
            }

            // log_message('error', print_r($data,true));
            // exit();

            $enrol = $this->applications_model->edit($data, ['id' => $id]);

            if ($enrol) 
            {
                $this->send_application_acknowledgement_email($id);
                session()->setFlashdata('message_success', "Course Enrolled Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
            return redirect()->to(base_url('admin/applications/edit/'.$id.'?active=6'));

            // return redirect()->to(base_url('admin/applications/index'));
        }
    }
    
    public function document_add($id)
    {
        if ($this->request->getMethod() == 'post') {
            // echo "<pre>"; print_r($this->request->getFiles());exit;
            $label = $this->request->getPost('label');

            $data = [
                'label' => $label,
                'student_id' => $id,
                'created_by' => get_user_id(),
                'created_at' => date('Y-m-d H:i:s')
            ];

            $image = $this->upload_file('students_file', 'file');
            if ($image && valid_file($image['file'])) {
                $data['file'] = $image['file'];
            }
            $user_id = $this->student_document_model->add($data);

            if ($user_id) {

                session()->setFlashdata('message_success', "Student Document Added Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong! Try Again.");
            }

            return redirect()->to(base_url('admin/applications/edit/' . $id .'?active=5'));
        } else {
            $this->data['id'] = $id;
            return view('Admin/Student_document/add', $this->data);
        }
    }
    
       public function document_edit($id)
    {
        if ($this->request->getMethod() == 'post') {

            // echo "<pre>"; print_r($this->request->getFiles());exit;
            $label = $this->request->getPost('label');
            $student_id = $this->request->getPost('student_id');

            $data = [
                'label' => $label,
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s')
            ];

            $image = $this->upload_file('students_file', 'file');
            if ($image && valid_file($image['file'])) {
                $data['file'] = $image['file'];
            }
            $user_id = $this->student_document_model->edit($data, ['student_document_id' => $id]);

            if ($user_id) {

                session()->setFlashdata('message_success', "Student Document Updated Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong ! Try Again.");
            }

            return redirect()->to(base_url('admin/applications/edit/' . $student_id .'?active=5'));
        } else {
            $student_id = $this->request->getVar('student_id');
            $this->data['student_id'] = $student_id;
            $this->data['edit_data'] = $this->student_document_model->get(['student_document_id' => $id])->getRowArray();
            return view('Admin/Student_document/edit', $this->data);
        }
    }

    public function document_delete($id)
    {
        $student_id = $this->request->getVar('student_id');
        if ($id > 0) {

            if ($this->student_document_model->remove(['student_document_id' => $id])) {
                session()->setFlashdata('message_success', "Document Deleted Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        } else {
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/applications/edit/' . $student_id.'?active=5'));
    }

    public function get_pipeline_users(){
        
        $role_id = $this->request->getPost('role_id');

        $users = $this->users_model->get(['role_id' => $role_id])->getResultArray();

        return $this->response->setJSON($users);
    }
    

    public function ajax_verify_email()
    {
        $email = $this->request->getPost('email');

        if (!$email) {
            return $this->response->setJSON(['status' => false, 'message' => 'No email provided']);
        }

        $result = verify_email_real($email);
        log_message('error','result : ' . print_r($result,true));   

        if ($result['is_valid']) {
            return $this->response->setJSON(['status' => true, 'message' => 'Email is valid']);
        } else {
            return $this->response->setJSON(['status' => false, 'message' => 'Email is invalid']);
        }
    }

    private function send_application_acknowledgement_email($application_id)
    {
        $application_data = $this->applications_model->get_join(
            [
                ['course', 'applications.course_id = course.id'],
                ['batch', 'applications.batch_id = batch.id'],
            ],
            ['applications.id' => $application_id],
            ['applications.*','course.title as course_title','batch.title as batch_title']
        )->getRowArray();
        //log_message('error','application_data : ' . print_r($application_data,true));
        //log_message('error','------------------');

        $subject = "Application Received – Teachers' Training Institute of India";

        // $instructor_id = $this->instructor_enrol_model->get(['course_id' => $cohort_data['course_id']])->getRow()->instructor_id;

        // $instructor_name = $cohort_data['instructor_name'] ?? '-';

        // $subject = 'Welcome to Your Cohort for ' . $cohort_data['subject_name'];

        // $toEmail = "php.trogon@gmail.com";
        $user = $this->applications_model->get(['id' => $application_id])->getRowArray();
        $toName = $user['name'];

        $course_name = $application_data['course_title'] ?? "";
        $course_intake = $application_data['batch_title'] ?? "";
        $toEmail = $user['user_email'];
        
        $bodyContent = "<!DOCTYPE html>
            <html lang=\"en\">
            <head>
                <meta charset=\"UTF-8\">
                <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                <title>Application Received – Teachers' Training Institute of India</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        line-height: 1.6;
                        color: #2d3748;
                        background-color: #f7fafc;
                    }
                    .email-container {
                        max-width: 650px;
                        margin: 20px auto;
                        background: #ffffff;
                        overflow: hidden;
                    }
                    .top-accent {
                        height: 5px;
                        background: linear-gradient(to right, #8B5CF6, #0a875c, #8B5CF6);
                    }
                    .header {
                        position: relative;
                        padding: 10px;
                        text-align: center;
                        background: white;
                    }
                    .header::after {
                        content: '';
                        position: absolute;
                        bottom: -20px;
                        left: 0;
                        right: 0;
                        height: 40px;
                        background: white;
                        transform: skewY(-2deg);
                    }
                    .logo-wrapper {
                        position: relative;
                        z-index: 1;
                        display: inline-block;
                        padding: 20px 40px;
                        border-radius: 0 0 20px 20px;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    }
                    .logo {
                        max-width: 150px;
                        height: auto;
                        font-size: 24px;
                        font-weight: bold;
                        color: #8B5CF6;
                    }
                    .content {
                        position: relative;
                        padding: 60px 40px 40px;
                        background: white;
                    }
                    .notification-card {
                        background: white;
                        border: 1px solid #e2e8f0;
                        border-radius: 16px;
                        padding: 30px;
                        margin-bottom: 30px;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    }
                    .message-content {
                        color: #4a5568;
                        font-size: 16px;
                        line-height: 1.8;
                    }
                    .course-details {
                        background: #f8faf9;
                        padding: 20px;
                        border-radius: 12px;
                        margin: 20px 0;
                        border-left: 4px solid #8B5CF6;
                    }
                    .course-details h3 {
                        font-size: 18px;
                        font-weight: 600;
                        color: #2d3748;
                        margin-bottom: 15px;
                    }
                    .detail-item {
                        margin: 10px 0;
                        font-size: 15px;
                    }
                    .detail-label {
                        font-weight: 600;
                        color: #2d3748;
                    }
                    .detail-value {
                        color: #4a5568;
                    }
                    .status-badge {
                        display: inline-block;
                        background: #e6fffa;
                        color: #065f46;
                        padding: 8px 16px;
                        border-radius: 20px;
                        font-size: 14px;
                        font-weight: 600;
                        margin: 15px 0;
                        border: 1px solid #10b981;
                    }
                    .footer {
                        background: #f8faf9;
                        padding: 30px;
                        text-align: center;
                        border-top: 1px solid #e2e8f0;
                    }
                    .footer-text {
                        color: #718096;
                        font-size: 14px;
                        margin: 5px 0;
                    }
                    .divider {
                        width: 60px;
                        height: 2px;
                        background: rgba(237,119,29,0.3);
                        margin: 15px auto;
                    }
                    @media only screen and (max-width: 600px) {
                        .email-container {
                            margin: 0;
                        }
                        .header, .content {
                            padding: 20px;
                        }
                        .logo-wrapper {
                            padding: 15px 30px;
                        }
                        .notification-card {
                            padding: 20px;
                        }
                    }
                    @media only screen and (max-width: 768px) {
                        .email-container { margin: 0; max-width: 100%; }
                        .header { padding: 30px 20px; }
                        .content { padding: 40px 20px 20px; }
                        .logo-wrapper { padding: 15px 25px; }
                        .logo { max-width: 120px; }
                        .notification-card { padding: 20px; margin-bottom: 30px; }
                        .info-grid { flex-direction: column; gap: 15px; }
                        .info-box { flex: 1 1 100%; margin-bottom: 15px; }
                        .cta-button { padding: 14px 30px; font-size: 14px; }
                    }
                    @media only screen and (max-width: 480px) {
                        .email-container { margin: 0; }
                        .header { padding: 20px 15px; }
                        .content { padding: 30px 15px 15px; }
                        .logo-wrapper { padding: 12px 20px; }
                        .logo { max-width: 100px; }
                        .notification-card { padding: 15px; margin-bottom: 20px; }
                        .message-content { font-size: 14px; }
                        .cta-button { padding: 12px 25px; font-size: 13px; width: 100%; max-width: 280px; }
                        .info-box { padding: 20px; }
                        .info-label { font-size: 11px; }
                        .info-content { font-size: 14px; }
                        .footer { padding: 20px 15px; }
                        .footer-text { font-size: 13px; }
                    }
                </style>
            </head>
            <body>
                <div class=\"email-container\">
                    <div class=\"top-accent\"></div>
                    
                    <div class=\"content\">
                        <div class=\"notification-card\">
                            <div class=\"message-content\">
                                <p>Dear {$toName},</p>
                                <br>
                                <p>Thank you for submitting your application to <strong>Teachers' Training Institute of India</strong>.</p>
                                <br>
                                <p>We have successfully received your application and it is now under review. We will update you on the status of your enrollment shortly.</p>
                                
                                <div class=\"status-badge\">
                                    ✓ Application Under Review
                                </div>

                                <div class=\"course-details\">
                                    <h3>Course Information:</h3>
                                    <div class=\"detail-item\">
                                        • <span class=\"detail-label\">Course Name:</span> 
                                        <span class=\"detail-value\">{$course_name}</span>
                                    </div>
                                    <div class=\"detail-item\">
                                        • <span class=\"detail-label\">Intake:</span> 
                                        <span class=\"detail-value\">{$course_intake}</span>
                                    </div>
                                </div>
                                
                                <p>If you have any questions or need assistance during the application process, please don't hesitate to contact us at <a href=\"mailto:support@teachersindia.in\" style=\"color: #8B5CF6;\">support@teachersindia.in</a>.</p>
                                <br>
                                <p>We appreciate your interest in our programs and look forward to welcoming you to our institute!</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class=\"footer\">
                        <p class=\"footer-text\">Best regards,<br><strong>Teachers' Training Institute of India</strong></p>
                        <div class=\"divider\"></div>
                        <p class=\"footer-text\">© 2025 Teachers' Training Institute of India</p>
                        <p class=\"footer-text\">This email was sent to {$toEmail}</p>
                    </div>
                </div>
            </body>
            </html>";
        
        send_email_message($toEmail, $toName, $subject, $bodyContent, 'Teachers’ Training Institute of India');
    }
}
