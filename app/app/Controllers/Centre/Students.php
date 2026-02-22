<?php
namespace App\Controllers\Centre;

use App\Models\Users_model;
use App\Models\User_details_model;
use App\Models\Batch_model;
use App\Models\Enrol_model;
use App\Models\Course_model;
use App\Models\Instructor_enrol_model;
use App\Models\Payment_model;
use App\Models\Country_model;
use App\Models\Languages_model;
use App\Models\Student_fee_model;
use App\Models\Student_document_model;
use App\Models\Qualification_model;

class Students extends CentreBaseController
{
    private $users_model;
    private $user_details_model;

    private $batch_model;
    private $enrol_model;
    private $course_model;
    private $instructor_enrol_model;
    private $payment_model;
    private $country_model;
    private $languages_model;
    private $student_fee_model;
    private $student_document_model;
    private $qualification_model;


    public function __construct()
    {
        parent::__construct();

        $this->users_model = new Users_model();
        $this->user_details_model = new User_details_model();
        $this->batch_model = new Batch_model();
        $this->enrol_model = new Enrol_model();
        $this->course_model = new Course_model();
        $this->instructor_enrol_model = new Instructor_enrol_model();
        $this->payment_model = new Payment_model();
        $this->country_model = new Country_model();
        $this->languages_model = new Languages_model();
        $this->student_fee_model = new Student_fee_model();
        $this->student_document_model = new Student_document_model();
        $this->qualification_model = new Qualification_model();
    }

    public function index()
    {
        // Get current logged-in user's ID
        $logged_in_user_id = get_user_id();
        $centre_id = $this->users_model->get(['id' => $logged_in_user_id])->getRowArray()['centre_id'] ?? 0;
        $filter_where = [
            'role_id'    => 2,
            'added_under_centre' => $centre_id
        ];

        // if (!empty($this->request->getGet('from_date')) && !empty($this->request->getGet('to_date'))){
        //     $filter_where['created_at >='] = $this->request->getGet('from_date') . ' 00:00:00';
        //     $filter_where['created_at <='] = $this->request->getGet('to_date') . ' 23:59:59';
        // }

        if ($this->request->getGet('status') > 0) {
            $filter_where['status'] = $this->request->getGet('status');
        }

        $role = get_role_id();

        // if ($role == 3) {
        //     $user_id = get_user_id();
        //     $course_data = $this->instructor_enrol_model->get(['instructor_id' => $user_id])->getResultArray();
            
        //     $students = [];
        //     foreach ($course_data as $course) {
        //         $students = $this->enrol_model->get_enroled_students($course['course_id']);
        //     }
        // } else {
            $students = $this->users_model->get($filter_where, null, ['id', 'desc'])->getResultArray();
        // }

        if (!empty($students)) {
            foreach ($students as $key => $val) {
                // $students[$key]['course'] = $this->enrol_model->get_join(
                //     [['course', 'course.id = enrol.course_id']],
                //     ['enrol.user_id' => $val['id']],
                //     ['course.id', 'title']
                // )->getResultArray();
                $students[$key]['course_enrol_status'] = null;
                $students[$key]['course'] = $this->enrol_model->get_join(
                    [['course', 'course.id = enrol.course_id']],
                    ['enrol.user_id' => $val['id']],
                    ['course.id', 'title','batch_id']
                )->getResultArray();


                $student_enrol = $this->enrol_model->get_join(
                        [
                            ['course', 'course.id = enrol.course_id','left'],
                            ['batch', 'batch.id = enrol.batch_id','left'],
                            ['languages', 'languages.id = enrol.preferred_language','left'],
                        ],
                        ['enrol.user_id' => $val['id'],'enrol.course_id' => $val['course_id']],
                        [
                            'course.title as course_title','batch.title as batch_title','enrollment_status','enrollment_id'
                        ]
                    )->getRowArray();
                if(!empty($student_enrol)){
                    $students[$key]['course_enrol_status'] = $student_enrol['enrollment_status'];
                    $students[$key]['enrollment_id'] = $student_enrol['enrollment_id'];
                    $students[$key]['course_title'] = $student_enrol['course_title'];
                    $students[$key]['batch_title'] = $student_enrol['batch_title'];
                    
                }
            }
        }

        $this->data['students'] = $students;
        $this->data['course'] = $this->course_model->get()->getResultArray();
        $this->data['page_title'] = 'Students';
        $this->data['page_name'] = 'Students/index';

        return view('Centre/index', $this->data);
    }

    public function applications()
    {
        $this->data['page_title'] = 'Students';
        $this->data['page_name'] = 'Students/applications';
        return view('Centre/index', $this->data);
    }

    public function add()
    {
        if ($this->request->getMethod() === 'post') 
        {
            // echo "<pre>";
            // print_r($_POST); exit();
            
            $phone = $this->request->getPost('code') . $this->request->getPost('phone');

            if ($this->users_model->get(['email' => $phone])->getNumRows() == 0) {
                $data = [
                    'name' => $this->request->getPost('name'),
                    'country_code' => $this->request->getPost('code'),
                    'phone' => $this->request->getPost('phone'),
                    'email' => $phone,
                    'user_email' => $this->request->getPost('email'),
                    'role_id' => 2,
                    'created_by' => get_user_id(),
                    'updated_by' => get_user_id(),
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];

                $croppedImage = $this->request->getPost('cropped_image');
                $image = null;
                
                if (!empty($croppedImage)) {
                    $image = $this->upload_base64_image('students', $croppedImage);
                }
                
                if ($image && valid_file($image['file'])) {
                    $data['profile_picture'] = $image['file'];
                }
                
                     $lastId  = $this->users_model->get(['role_id' => 2],[],['id','desc'])->getRow();
                    
                    if(!empty($lastId))
                    {
                        $num = (int)substr($lastId->centre_id ?? 0, 2); // Extract numeric part: 2
                        $nextNum = $num + 1; // Increment: 3
                        $data['student_id'] = 'TTS' . str_pad($nextNum, 4, '0', STR_PAD_LEFT); // Format: TT0003
                    }
                    else
                    {
                        $data['student_id'] = 'TTS' . str_pad(1, 4, '0', STR_PAD_LEFT); // Format: TT0003
                    }
        


                $user_id = $this->users_model->add($data);
                if ($user_id) 
                {

                    $student_data = [
                        'user_id' => $user_id,
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
                       
                        
                        'created_by' => get_user_id(),
                        'created_at' => date('Y-m-d H:i:s')
                    ];
                    
                    
               
                    $student_id = $this->user_details_model->add($student_data);
                    
                    
                    $session = session();
                    $session->set([
                        'student_id' => $user_id
                    ]);
                    
                    
                    session()->setFlashdata('message_success', "Student Added Successfully!");
                } else {
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            } else {
                session()->setFlashdata('message_danger', "User Already Existed");
            }

            return redirect()->to(base_url('centre/students/add?active=2'));
        }

        $this->data['countries'] = $this->country_model->get([], ['country_id', 'country'])->getResultArray();
        $this->data['batch'] = $this->batch_model->get(['status' => 1], ['id', 'title'])->getResultArray();
        $this->data['course'] = $this->course_model->get([], ['title', 'id'])->getResultArray();
        $this->data['language'] = $this->languages_model->get([], ['title', 'id'])->getResultArray();
        $this->data['country_code'] = get_country_code();
        $this->data['activeTab'] = $this->request->getGet('active') ? $this->request->getGet('active') : '1'; 
        $this->data['enrol_data'] = [];
        
        
        if(!empty($_SESSION['student_id']))
        {
            $id = $_SESSION['student_id'];
            
            $this->data['payments'] = $this->student_fee_model->get(['user_id' => $id])->getResultArray();

            $this->data['edit_data'] = $this->users_model->get_join(
                    [
                        ['user_details', 'user_details.user_id = users.id','left'],
                    ],
                    ['users.id' => $id],
                    [
                        'users.*','user_details.*'
                    ]
                )->getRowArray();
                
                
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
        {
            $this->data['course_details'] = [];
            $this->data['payments'] = [];
             $this->data['edit_data'] = [];
        }
        
        // echo "<pre>";
        // print_r($_SESSION); exit();
        
        $this->data['page_title'] = 'Add Students';
        $this->data['page_name'] = 'Students/add';
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
    
                    
                     return redirect()->to(base_url('centre/students/add?active=3'));
                    session()->setFlashdata('message_success', "Student Added Successfully!");
                } else {
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            
            } else {
                session()->setFlashdata('message_danger', "User Already Existed");
            }

            return redirect()->to(base_url('centre/students/index'));
     
     
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
    
                    
                     return redirect()->to(base_url('centre/students/edit/'.$id.'?active=3'));
                    session()->setFlashdata('message_success', "Education Added Successfully!");
                } 
                else 
                {
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            
            

            return redirect()->to(base_url('centre/students/index'));
     
     
    }
    
    public function delete_qualification()
    {
        $id = $this->request->getVar('id');
        $qual = $this->request->getVar('qual');

        if ($id && $qual) {
            $data = [
                'board' => null,
                'percentage' => null,
                'certificate' => null,
                'marksheet' => null,
                'updated_at' => date('Y-m-d H:i:s'),
                'updated_by' => get_user_id(),
            ];

            $update_result = $this->qualification_model->edit($data, [
                'user_id' => $id,
                'qualification' => $qual,
            ]);

            // Set flash messages
            if ($update_result) {
                session()->setFlashdata('message_success', "Student Qualification deletd Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong while deleteing qualification details! Try Again.");
            }
        } else {
            session()->setFlashdata('message_danger', "Pass correct arguments");
        }

        return redirect()->to(base_url('centre/students/edit/'.$id.'?active=3'));
    }
    
    
    public function edit($id)
    {

        if ($this->request->getMethod() === 'post') 
        {
         
            
            $name = ucfirst($this->request->getPost('name'));
            $code = $this->request->getPost('code');
            $phone = $this->request->getPost('phone');

            $check_phone_duplication = $this->users_model
                ->get(['country_code' => $code, 'phone' => $phone, 'id !=' => $id])->getNumRows();
         

            if ($check_phone_duplication == 0) {
                $data = [
                    'name' => $this->request->getPost('name'),
                    'country_code' => $this->request->getPost('code'),
                    'phone' => $this->request->getPost('phone'),
                    'email' => $phone,
                    'user_email' => $this->request->getPost('email'),
                    'role_id' => 2,
                    'created_by' => get_user_id(),
                    'updated_by' => get_user_id(),
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];


             
             
                $croppedImage = $this->request->getPost('cropped_image');
                $image = null;
                
                if (!empty($croppedImage)) {
                    $image = $this->upload_base64_image('students', $croppedImage);
                }
                
                if ($image && valid_file($image['file'])) {
                    $data['profile_picture'] = $image['file'];
                }

                // Update user data
                $update_result = $this->users_model->edit($data, ['id' => $id]);
                

                if ($update_result) 
                {
                    $details = $this->user_details_model->get(['user_id' => $id])->getResultArray();

                    $student_data = [
                            'user_id' => $id,
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
                            'updated_by' => get_user_id(),
                            'updated_at' => date('Y-m-d H:i:s')
                        ];
                
                    if(!empty($details))
                    {
                        $student_result = $this->user_details_model->edit($student_data, ['user_id' => $id]);
                    }
                    else
                    {
                        $student_result = $this->user_details_model->add($student_data);
                    }


                    if ($student_result) {
                        session()->setFlashdata('message_success', "Student Updated Successfully!");
                        echo '$no_student_result';exit;
                    } else {
                        session()->setFlashdata('message_danger', "Something went wrong while updating student details! Try Again");
                        
                    }
                } else {
                    session()->setFlashdata('message_danger', "Something went wrong while updating user details! Try Again");
                    
                }
            } else {
                session()->setFlashdata('message_danger', "Phone or Email Already Exists");
                
            }
            return redirect()->to(base_url('centre/students/edit/' . $id .'?active=2'));
        } 
        else 
        {
            $this->data['edit_data'] = $this->users_model->get(['users.id' => $id],[] )->getRowArray();
            
            $details = $this->user_details_model->get(['user_id' => $id])->getResultArray();
            
            if (!empty($details)) {
                foreach ($details as $detail) {
                    // Assuming there's a unique field like `user_id` in both
                    if ($detail['user_id'] == $id) 
                    {
                        $this->data['edit_data'] = array_merge($this->data['edit_data'], $detail);
                        $this->data['edit_data']['id'] = $id;
                    }
                    
                    
                }
            }
            
            $this->data['edit_data']['user_id'] = $id;
          
            $this->data['payments'] = $this->student_fee_model->get(['user_id' => $id])->getResultArray();
            $this->data['enrol_data'] = $this->enrol_model->get(['user_id' => $id,'course_id' => $this->data['edit_data']['course_id']])->getRowArray();
            
          
            $this->data['country_code'] = get_country_code();
            $this->data['consultants'] = array_column($this->users_model->get(['role_id' => 6], ['id', 'name'])->getResultArray(), 'name', 'id');
            $this->data['clients'] = array_column($this->users_model->get(['role_id' => 8], ['id', 'name'])->getResultArray(), 'name', 'id');
            $this->data['countries'] = $this->country_model->get([], ['country_id', 'country'])->getResultArray();
            $this->data['sequance'] = "UPC00" . $this->data['edit_data']['student_id'];
            $this->data['batch'] = $this->batch_model->get(['status' => 1], ['id', 'title'])->getResultArray();
            $this->data['course'] = $this->course_model->get([], ['title', 'id'])->getResultArray();
            $this->data['language'] = $this->languages_model->get([], ['title', 'id'])->getResultArray();

            $courses = $this->course_model->get()->getResultArray();
            $this->data['courses'] = array_column($courses, 'title', 'id');
            
            if (!empty($this->data['edit_data']['course_id'])) 
            {
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
            
            
            // echo "<pre>";
            // print_r($this->data['edit_data']); exit();

            $this->data['page_title'] = 'Update Student';
            $this->data['page_name'] = 'Students/add';
            
            // print_r($this->data['edit_data']['password']); exit();

            return view('Centre/index', $this->data);
        }
    }
    
    
    

    public function ajax_edit($id)
    {
        $this->data['course'] = $this->course_model->get()->getResultArray();
        $this->data['edit_data'] = $this->users_model->get(['id' => $id])->getRowArray();
        echo view('centre/Students/ajax_edit', $this->data);
    }

    public function edit_info($id)
    {
        if ($this->request->getMethod() === 'post') {
            $data = [
                'username' => $this->request->getPost('username'),
                'password'     => $this->users_model->password_hash($this->request->getPost('password')),                             
                'student_id' => $this->request->getPost('student_id'),
                // 'phone' => $this->request->getPost('phone'),
                // 'email' => $this->request->getPost('code') . $this->request->getPost('phone'),
                // 'biography' => $this->request->getPost('biography'),
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];

            $response = $this->users_model->edit($data, ['id' => $id]);

            if ($response) {
                session()->setFlashdata('message_success', "Student Updated Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }

        return redirect()->to(base_url('centre/students/index'));
    }

    public function ajax_view($id)
    {
        $this->data['view_data'] = $this->users_model->get(['id' => $id])->getRowArray();
        echo view('centre/Students/ajax_view', $this->data);
    }
    
    
    
    public function view($id)
    {
        $this->data['view_data'] = $view_data =$this->users_model->get(['id' => $id])->getRowArray();
      
        $this->data['user_data'] = $this->user_details_model->get(['user_id' => $id])->getRowArray();
        
        $this->data['documents'] = $this->student_document_model->get(['student_id' => $id])->getResultArray();
        
        $this->data['payments'] = $this->student_fee_model->get(['user_id' => $id])->getResultArray();

        $this->data['enrol_data'] = $this->enrol_model->get(['user_id' => $id,'course_id' => $view_data['course_id']])->getRowArray();
        
        $this->data['enrol_data'] = $this->enrol_model->get_join(
                    [
                        ['course', 'course.id = enrol.course_id','left'],
                        ['batch', 'batch.id = enrol.batch_id','left'],
                        ['languages', 'languages.id = enrol.preferred_language','left'],
                    ],
                    ['enrol.user_id' => $id,'enrol.course_id' => $view_data['course_id']],
                    [
                        'course.title as course_title','batch.title as batch_title','languages.title as language_title','enrollment_status','mode_of_study','enrol.created_at'
                    ]
                )->getRowArray();

        // echo "<pre>";
        // print_r($this->data['enrol_data']); exit();
        $this->data['qualification'] = $this->qualification_model->get(['user_id' => $id])->getResultArray();

        $this->data['page_title'] = 'View Student';
        $this->data['page_name'] = 'Students/view';
        return view('Centre/index', $this->data);
    }
    
    
    
    
    
    
    
    
    
    
    

    public function delete($id)
    {
        if ($id > 0) {
            $enrol_data = $this->enrol_model->get(['user_id' => $id])->getNumRows();
            $payment_data = $this->payment_model->get(['user_id' => $id])->getNumRows();
            echo 'here';exit;

            if ($payment_data > 0) {
                session()->setFlashdata('message_danger', "You Can't Delete Student! Payment exists for student");
            } elseif ($enrol_data > 0) {
                session()->setFlashdata('message_danger', "You Can't Delete Student! Enrolled in course");
            } elseif ($this->users_model->remove(['id' => $id])) {
                session()->setFlashdata('message_success', "Student Deleted Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        } else {
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }

        return redirect()->to(base_url('centre/students/index'));
    }

    public function enrol($id)
    {
        $this->data['student'] = $id;
        $this->data['course'] = $this->course_model->get()->getResultArray();

        echo view('centre/Students/enrol', $this->data);
    }

    public function enrol_course($id)
    {
        if ($this->request->getMethod() === 'post') 
        {
            $course_id  = $this->request->getPost('course');
            
            $check_existing = $this->enrol_model->get(['user_id' => $id,'course_id' => $course_id])->getRowArray();
            
            $data = [
                'course_id' => $this->request->getPost('course'),
                'user_id' => $id,
                'batch_id' => $this->request->getPost('batch_id'),
                'enrollment_date' => $this->request->getPost('enrollment_date'),
                'enrollment_status' => $this->request->getPost('enrollment_status'),
                'mode_of_study' => $this->request->getPost('mode_of_study'),
                'preferred_language' => $this->request->getPost('preferred_language'),
                'created_by' => get_user_id(),
                'updated_by' => get_user_id(),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            
            if(!empty($check_existing))
            {
                $enrol = $this->enrol_model->edit($data, ['user_id' => $id,'course_id' => $course_id]);
            }
            else
            {
                $enrol = $this->enrol_model->add($data);
            }


            if ($enrol) 
            {
                $response = $this->users_model->edit(['course_id'=>$course_id], ['id' => $id]);
                
                session()->setFlashdata('message_success', "Course Enrolled Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
            return redirect()->to(base_url('centre/students/edit/'.$id.'?active=4'));

            // return redirect()->to(base_url('centre/students/index'));
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

            return redirect()->to(base_url('centre/students/edit/' . $id .'?active=5'));
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

                session()->setFlashdata('message_success', "Student Document Updated Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong ! Try Again.");
            }

            return redirect()->to(base_url('app/students/edit/' . $student_id .'?active=5'));
        } else {
            $student_id = $this->request->getVar('student_id');
            $this->data['student_id'] = $student_id;
            $this->data['edit_data'] = $this->student_document_model->get(['student_document_id' => $id])->getRowArray();
            return view('centre/Student_document/edit', $this->data);
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
        return redirect()->to(base_url('centre/students/edit/' . $student_id.'?active=5'));
    }
}
