<?php
namespace App\Controllers\Centre;

use App\Models\Applications_model;
use App\Models\Batch_model;

use App\Models\Course_model;
use App\Models\Centres_model;
use App\Models\Country_model;
use App\Models\Payment_model;

use App\Models\Languages_model;
use App\Models\Student_fee_model;
use App\Models\Student_document_model;
use App\Models\Qualification_model;

use App\Models\Users_model;
use App\Models\User_details_model;

use App\Models\Enrol_model;
use App\Models\Centre_course_plans_model;
class Applications extends CentreBaseController
{
    
    public function __construct()
    {
        parent::__construct();

        $this->applications_model = new Applications_model();
        $this->Centres_model = new Centres_model();
        
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
        $this->centre_course_plans_model = new Centre_course_plans_model();

    }

  public function index()
{
    $filter_where = [];

    // Apply status filter if available
    if ($this->request->getGet('status') > 0) {
        $filter_where['status'] = $this->request->getGet('status');
    }

    // Get current logged-in user's ID
    $logged_in_user_id = get_user_id();

    $centre_id = get_centre_name()['centre_db_id'];
    

    // Add user_id to the filter to fetch only applications created by current user
    $filter_where['applications.created_by'] = $logged_in_user_id;

    $filter_where['is_converted'] = 0;

    // Fetch applications using the custom get method
    $students = $this->applications_model->get_join([[
            'course','course.id = applications.course_id'
        ]],$filter_where, ['applications.*','course.title as course_title'], ['id', 'desc'])->getResultArray();

    
    $this->data['assigned_courses'] = $this->centre_course_plans_model->get_join([['course', 'course.id = centre_course_plans.course_id']],
                ['centre_id' => $centre_id],
                ['course.id as course_id','course.short_name','course.title as course_title','centre_course_plans.*'])->getResultArray();

    
    if ($status = $this->request->getGet('list_by')) {
        $validStatuses = ['pending', 'rejected'];

        if (in_array($status, $validStatuses)) {
            $students = array_filter($students, fn($stud) => $stud['status'] === $status);
        }
    }

    $pending_count = 0;
    $rejected_count = 0;
    foreach ($students as $key => $student) {
        if($student['status'] == 'pending') {
            $pending_count++;
        }

        if($student['status'] == 'rejected') {
            $rejected_count++;
        }
    }


    // Prepare other necessary data
    $this->data['user_id'] = $logged_in_user_id;
    $this->data['students'] = $students;
    $this->data['pending_count'] = $pending_count;
    $this->data['rejected_count'] = $rejected_count;
    $this->data['course'] = $this->course_model->get()->getResultArray();
    $this->data['page_title'] = 'Applications';
    $this->data['page_name'] = 'Applications/index';

    return view('Centre/index', $this->data);
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


            $logged_in_user_id = get_user_id();

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
                       
                    'added_under_centre' => $this->request->getPost('added_under_centre'),
                    'created_by' => $logged_in_user_id,
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
                    //$this->send_center_admin_notification($user_id, $data);
                    session()->setFlashdata('message_success', "Application Added Successfully!");
                } else {
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            } else {
                session()->setFlashdata('message_danger', "User Already Existed With This Email Or Phone Number!");
                return redirect()->to(base_url('centre/applications/add'));
            }

            return redirect()->to(base_url('centre/applications/add?active=2'));
        }

        $this->data['countries'] = $this->country_model->get([], ['country_id', 'country'])->getResultArray();
        $this->data['batch'] = $this->batch_model->get(['status' => 1], ['id', 'title'])->getResultArray();
        // $this->data['course'] = $this->course_model->get([], ['title', 'id'])->getResultArray();
        $centre_id = get_centre_name()['centre_db_id'];
        $this->data['course'] = $this->centre_course_plans_model->get_join([['course', 'course.id = centre_course_plans.course_id']],['centre_id' => $centre_id],['course.id as course_id','course.title as course_title','centre_course_plans.assigned_amount'])->getResultArray();
        $this->data['language'] = $this->languages_model->get([], ['title', 'id'])->getResultArray();
        $this->data['country_code'] = get_country_code();
        $this->data['pipeline_users'] = [];
        $this->data['activeTab'] = $this->request->getGet('active') ? $this->request->getGet('active') : '1'; 
        $this->data['enrol_data'] = [];
        $logged_in_user_id = get_user_id();
        $this->data['added_under_centre'] = $this->users_model->get(['id' => $logged_in_user_id])->getRow()->centre_id ?? null;
        
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

        }
        else
        {   $this->data['qualifications'] = [];
            $this->data['course_details'] = [];
            $this->data['payments'] = [];
             $this->data['edit_data'] = [];
        }
        
        // echo "<pre>";
        // print_r($_SESSION); exit();
        
        $this->data['page_title'] = 'Add Applications';
        $this->data['page_name'] = 'Applications/add';
        return view('Centre/index', $this->data);
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

                
                return redirect()->to(base_url('centre/applications/add?active=3'));
                session()->setFlashdata('message_success', "Student Education Added Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        
        } else {
            session()->setFlashdata('message_danger', "User Already Existed");
        }

        return redirect()->to(base_url('centre/applications/index'));
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
    
                    
                     return redirect()->to(base_url('centre/applications/edit/'.$id.'?active=3'));
                    session()->setFlashdata('message_success', "Education Added Successfully!");
                } 
                else 
                {
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            
            

            return redirect()->to(base_url('centre/applications/index'));
     
     
    }
    
    
    public function edit($id)
    {

        if ($this->request->getMethod() === 'post') 
        {
            
            $name = ucfirst($this->request->getPost('name'));
            $code = $this->request->getPost('code');
            $phone = $this->request->getPost('phone');

            $check_phone_duplication = $this->applications_model->get(['country_code' => $code, 'phone' => $phone, 'id !=' => $id])->getNumRows();

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
                    'pipeline' => $this->request->getPost('pipeline'),
                    'pipeline_user' => $this->request->getPost('pipeline_user'),
                                
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
                    session()->setFlashdata('message_success', "Application Updated Successfully!");
                } else {
                    session()->setFlashdata('message_danger', "Something went wrong while updating student details! Try Again");
                }
            
               
            } else {
                session()->setFlashdata('message_danger', "Phone or Email Already Exists");
            }
            return redirect()->to(base_url('centre/applications/edit/' . $id .'?active=2'));
        } 
        else 
        {
            $this->data['edit_data'] = $this->applications_model->get(['applications.id' => $id],[] )->getRowArray();
         
         
            $this->data['batch'] = $this->batch_model->get(['status' => 1], ['id', 'title'])->getResultArray();

            $this->data['payments'] = $this->student_fee_model->get(['user_id' => $id])->getResultArray();

            $this->data['country_code'] = get_country_code();

            $this->data['countries'] = $this->country_model->get([], ['country_id', 'country'])->getResultArray();
            // $this->data['course'] = $this->course_model->get([], ['title', 'id'])->getResultArray();
            $centre_id = get_centre_name()['centre_db_id'];
            $this->data['course'] = $this->centre_course_plans_model->get_join([['course', 'course.id = centre_course_plans.course_id']],['centre_id' => $centre_id],['course.id as course_id','course.title as course_title'])->getResultArray();
        
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
            $logged_in_user_id = get_user_id();
            $this->data['added_under_centre'] = $this->users_model->get(['id' => $logged_in_user_id])->getRow()->centre_id ?? null;

            $this->data['page_title'] = 'Update Application';
            $this->data['page_name'] = 'Applications/add';
            
            // print_r($this->data['edit_data']['password']); exit();

            return view('Centre/index', $this->data);
        }
    }
    

    public function edit_info($id)
    {
        if ($this->request->getMethod() === 'post') {
            helper('encryption');
            $data = [
                'username' => $this->request->getPost('username'),
                'password'     => $this->request->getPost('password'),                             
                'student_id' => $this->request->getPost('student_id'),
                // 'phone' => $this->request->getPost('phone'),
                // 'email' => $this->request->getPost('code') . $this->request->getPost('phone'),
                'biography' => $this->request->getPost('biography'),
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];

            $response = $this->applications_model->edit($data, ['id' => $id]);

            if ($response) {
                session()->setFlashdata('message_success', "Application Updated Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }

        return redirect()->to(base_url('centre/applications/index'));
    }

    public function ajax_view($id)
    {
        $this->data['view_data'] = $this->applications_model->get(['id' => $id])->getRowArray();
        echo view('centre/applications/ajax_view', $this->data);
    }
    
    
    
    public function view($id)
    {
        $this->data['view_data'] = $view_data = $this->applications_model->get_join(
                    [
                        ['course', 'course.id = applications.course_id','left'],
                        ['batch', 'batch.id = applications.batch_id','left'],
                        ['languages', 'languages.id = applications.preferred_language','left'],
                    ],
                    ['applications.id' => $id],
                    [
                        'applications.*','course.title as course_title','batch.title as batch_title','languages.title as language_title','enrollment_status','mode_of_study'
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
        return view('Centre/index', $this->data);
        // return view('Centre/index', $this->data); CAUSES ERROR ; centre v/s Centre
    }
    
    
    
    
    public function convert($id)
    {
        if ($id > 0) 
        {
            $application_data = $this->applications_model->get(['id' => $id])->getRowArray();
   
   
            if(!empty($application_data))
            {
                $data = [
                    'name' => $application_data['name'],
                    'country_code' => $application_data['country_code'],
                    'phone' => $application_data['phone'],
                    'email' => $application_data['country_code'].$application_data['phone'],
                    'user_email' => $application_data['user_email'],
                    'role_id' => 2,
                    'course_id' =>$application_data['course_id'],
                    'application_id' => $application_data['id'],
                    'created_by' => get_user_id(),
                    'updated_by' => get_user_id(),
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
                
                $lastId  = $this->users_model->add($data);
                
                // print_r($lastId); exit();
                

                if($lastId)
                {
                    $num = (int)$lastId; // Extract numeric part: 2
                    $nextNum = $num + 1; // Increment: 3
                    $data['student_id'] = 'TTS' . str_pad($nextNum, 4, '0', STR_PAD_LEFT); // Format: TT0003
                }
                else
                {
                    $data['student_id'] = 'TTS' . str_pad(1, 4, '0', STR_PAD_LEFT); // Format: TT0003
                }
                
                $user_id = $this->users_model->add($data);
                
                if($user_id)
                {
                    $student_data = [
                        'user_id' => $user_id,
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
                    
                    
                    
                    
                    $enroldata = [
                        'course_id' => $application_data['course_id'],
                        'user_id' => $user_id,
                        'batch_id' => $application_data['batch_id'],
                        'enrollment_date' => $application_data['enrollment_date'],
                        'enrollment_status' =>$application_data['enrollment_status'],
                        'mode_of_study' => $application_data['mode_of_study'],
                        'preferred_language' => $application_data['preferred_language'],
                        'created_by' => get_user_id(),
                        'updated_by' => get_user_id(),
                        'created_at' => date('Y-m-d H:i:s'),
                        'updated_at' => date('Y-m-d H:i:s'),
                    ];
                    
                    $enrol = $this->enrol_model->add($enroldata);
                    
                    
           
                }
                
                $this->applications_model->remove(['id' => $application_data['id']]);
                
            }
        } 
        else 
        {
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }

        return redirect()->to(base_url('centre/students/index'));
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

        return redirect()->to(base_url('centre/applications/index'));
    }

    public function enrol($id)
    {
        $this->data['student'] = $id;
        $this->data['course'] = $this->course_model->get()->getResultArray();

        echo view('centre/applications/enrol', $this->data);
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
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];

            $enrol = $this->applications_model->edit($data, ['id' => $id]);

            if ($enrol) 
            {
                session()->setFlashdata('message_success', "Course Enrolled Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
            // return redirect()->to(base_url('centre/applications/edit/'.$id.'?active=5'));

            return redirect()->to(base_url('centre/applications/index'));
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

                session()->setFlashdata('message_success', "Application Document Added Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong! Try Again.");
            }

            return redirect()->to(base_url('centre/applications/edit/' . $id .'?active=5'));
        } else {
            $this->data['id'] = $id;
            return view('centre/Student_document/add', $this->data);
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

                session()->setFlashdata('message_success', "Application Document Updated Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong ! Try Again.");
            }

            return redirect()->to(base_url('centre/applications/edit/' . $student_id .'?active=5'));
        } else {
            $student_id = $this->request->getVar('student_id');
            $this->data['student_id'] = $student_id;
            $this->data['edit_data'] = $this->student_document_model->get(['student_document_id' => $id])->getRowArray();
            return view('Centre/Student_document/edit', $this->data);
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
        return redirect()->to(base_url('Centre/applications/edit/' . $student_id.'?active=5'));
    }


    public function get_pipeline_users(){
        
        $role_id = $this->request->getPost('role_id');

        $users = $this->users_model->get(['role_id' => $role_id])->getResultArray();

        return $this->response->setJSON($users);
    }

    private function send_center_admin_notification($application_id, $application_data)
    {
        // Get all center admins (users with role_id = 7)
        $center_admins = $this->users_model->get(['id'=>get_user_id(),'role_id' => 7])->getResultArray();
        
        if (empty($center_admins)) {
            return; // No center admins to notify
        }

        // Get course details
        $course_name = '';
        if (!empty($application_data['course_id'])) {
            $course = $this->course_model->get(['id' => $application_data['course_id']], ['title'])->getRow();
            $course_name = $course ? $course->title : '';
        }

        $subject = "New Application Submitted – Action Required";
        $application_link = base_url('centre/applications/view/' . $application_id);
        $submission_date = date('F j, Y', strtotime($application_data['created_at']));

        foreach ($center_admins as $admin) {
            $toEmail = $admin['user_email'];
            $toName = $admin['name'];
            
            $bodyContent = "<!DOCTYPE html>
            <html lang=\"en\">
            <head>
                <meta charset=\"UTF-8\">
                <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                <title>New Application Submitted – Action Required</title>
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
                    .applicant-details {
                        background: #f8faf9;
                        padding: 20px;
                        border-radius: 12px;
                        margin: 20px 0;
                        border-left: 4px solid #8B5CF6;
                    }
                    .applicant-details h3 {
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
                    .action-button {
                        display: inline-block;
                        background: #8B5CF6;
                        color: white;
                        padding: 12px 30px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 600;
                        margin: 20px 0;
                        transition: background-color 0.3s;
                    }
                    .action-button:hover {
                        background: rgb(217 99 9);
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
                        .content {
                            padding: 20px;
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
                                <p>A new application has been submitted for processing at your center.</p>
                                
                                <div class=\"applicant-details\">
                                    <h3>Applicant Details:</h3>
                                    <div class=\"detail-item\">
                                        • <span class=\"detail-label\">Name:</span> 
                                        <span class=\"detail-value\">{$application_data['name']}</span>
                                    </div>
                                    <div class=\"detail-item\">
                                        • <span class=\"detail-label\">Course Applied For:</span> 
                                        <span class=\"detail-value\">{$course_name}</span>
                                    </div>
                                    <div class=\"detail-item\">
                                        • <span class=\"detail-label\">Submission Date:</span> 
                                        <span class=\"detail-value\">{$submission_date}</span>
                                    </div>
                                </div>
                                
                                <p>Please review and process the application at your earliest convenience.</p>
                                
                                <div style=\"text-align: center;\">
                                    <a href=\"{$application_link}\" class=\"action-button\">View Application</a>
                                </div>
                                
                                <p>For any assistance, please contact <a href=\"mailto:support@teachersindia.in\" style=\"color: #8B5CF6;\">support@teachersindia.in</a>.</p>
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
            
            send_email_message($toEmail, $toName, $subject, $bodyContent, 'TTII Education');
        }
    }
}
