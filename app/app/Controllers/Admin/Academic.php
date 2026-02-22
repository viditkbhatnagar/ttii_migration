<?php
namespace App\Controllers\App;
use App\Models\Leads_model;
use App\Models\Users_model;
use App\Models\Enrol_model;
use App\Models\Lead_status_model;
use App\Models\Lead_source_model;
use App\Models\Lead_activity_model;
use App\Models\Country_model;
use App\Models\Student_activity_model;
use App\Models\Course_model;
use App\Models\Subjects_model;
use App\Models\Lead_upload_model;
use App\Models\University_model;
use App\Models\Semester_model;
use App\Models\Invoice_model;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date;
use App\Models\Sessions_model;
use App\Models\Students_model;
use App\Models\Finance_model;
use App\Models\Qualification_model;
use DateTime;

class Academic extends AppBaseController
{
    private $users_model;
    private $enrol_model;
    private $leads_model;
    private $lead_status_model;
    private $lead_source_model;
    private $lead_activity_model;
    private $country_model;
    private $student_activity_model;
    private $course_model;
    private $subjects_model;
    private $sessions_model;
    private $lead_upload_model;
    private $students_model;
    private $finance_model;
    private $qualification_model;

    public function __construct()
    {
        parent::__construct();
        $this->users_model = new Users_model();
        $this->enrol_model = new Enrol_model();
        $this->leads_model = new Leads_model();
        $this->lead_status_model = new Lead_status_model();
        $this->lead_source_model = new Lead_source_model();
        $this->lead_activity_model = new Lead_activity_model();
        $this->country_model = new Country_model();
        $this->student_activity_model = new Student_activity_model();
        $this->course_model = new Course_model();
        $this->subject_model = new Subjects_model();
        $this->lead_upload_model = new Lead_upload_model();
        $this->sessions_model = new Sessions_model();
        $this->university_model = new University_model();
        $this->semester_model = new Semester_model();
        $this->invoice_model = new Invoice_model();
        $this->students_model = new Students_model();
        $this->finance_model = new Finance_model();
        $this->qualification_model = new Qualification_model();
    }

    public function index() {
        $where = [];
        
        if(is_telecallers()) {
            $where = [
                'users.role_id' => 4,
                'users.telecaller_id' => get_user_id()
            ];
        } elseif (is_institutions()){
            $where = [
                'users.role_id' => 4,
                'users.created_by' => get_user_id()
            ];
        } else {
            $where = [
                'users.role_id' => 4
            ];
        }
        
        
        if (!empty($this->request->getGet('from_date')) && !empty($this->request->getGet('to_date'))) {
            $where += [
                'users.created_at >=' => $this->request->getGet('from_date') . ' 00:00:00',
                'users.created_at <=' => $this->request->getGet('to_date') . ' 23:59:59'
            ];
        }
        if ($this->request->getGet('university_id') != null) {
            $where += [
                'users.university_id' => (int)$this->request->getGet('university_id') 
            ];
            
        }
        
        if ($this->request->getGet('admission_status') != null) {
            $where += [
                'students.admission_status' => (int)$this->request->getGet('admission_status') 
            ];
            
        }
    
        $this->data['students'] = $this->users_model->get_join(
            [
                ['students', 'students.student_id = users.id'], 
            ],
            $where,
            [
                'users.*', 
                'students.student_id',
                'students.enrollment_id',
                'students.application_id',
                'students.consultant_id',
                'students.admission_status', 
            ]
        )->getResultArray();
 
        // $this->data['students'] = $this->users_model->get($where)->getResultArray();
        $university = $this->university_model->get()->getResultArray();
        $this->data['universities'] = array_column($this->university_model->get()->getResultArray(),'title','id');
        $this->data['page_title'] = 'Academic';
        $this->data['page_name'] = 'Academic/index';
        
        return view('App/index', $this->data);
    }
    
    
    function cleanArray($array) {
        $filteredArray = array_filter($array, function($item) {
            return !is_null($item) && $item !== '';
        });
    
        return json_encode($filteredArray, JSON_FORCE_OBJECT); 
    }
    
    public function edit($id){
        
        if ($this->request->getMethod() === 'post'){
            // echo "<pre>"; print_r( $this->request->getPost()); exit;
            $course_id = $this->request->getPost('course_id');
            
            
            // $course_status = $this->request->getPost('course_status');
            // $attendance = $this->request->getPost('attendance');
            // $midtermGrades = $this->request->getPost('midtermGrades');
            // $paymentStatus = $this->request->getPost('paymentStatus');
            // $finalGrades = $this->request->getPost('finalGrades');
            // $course_status = $this->cleanArray($course_status);
            // $attendance = $this->cleanArray($attendance);
            // $midtermGrades = $this->cleanArray($midtermGrades);
            // $paymentStatus = $this->cleanArray($paymentStatus);
            // $finalGrades = $this->cleanArray($finalGrades);
    
            
            $data = [
                'university_id' => $this->request->getPost('university_id'),
                'updated_at' => date('Y-m-d H:i:s'),
                'updated_by' => get_user_id(),
            ];

            // Update user data
            $update_result = $this->users_model->edit($data, ['id' => $id]);

            if ($update_result){

                $student_data = [
                    'student_id'=> $id,
                    'enrollment_id'=> $this->request->getPost('enrollment_id'),
                    'application_id'=> $this->request->getPost('application_id'),
                    'consultant_id'=> $this->request->getPost('consultant_id'),
                    'admission_status'=> $this->request->getPost('admission_status'),
                    'course_id'=> $course_id,
                    'mode'=> $this->request->getPost('mode'),
                    'session_id'=> $this->request->getPost('session_id'),
                    'source'=> $this->request->getPost('source'),
                    // 'course_status'=> $course_status,
                    // 'attendance'=> $attendance,
                    // 'midtermGrades'=> $midtermGrades,
                    // 'paymentStatus' => $paymentStatus,
                    // 'finalGrades'=> $finalGrades,
                    'updated_by'=> get_user_id(),
                    'updated_at'=> date('Y-m-d H:i:s')
                ];

                $student_result = $this->students_model->edit($student_data, ['student_id' => $id]);

                if ($student_result){
                    session()->setFlashdata('message_success', "Student Academic Updated Successfully!");
                } else {
                    session()->setFlashdata('message_danger', "Something went wrong while updating student details! Try Again");
                }

            } else {
                session()->setFlashdata('message_danger', "Something went wrong while updating user details! Try Again");
            }
    
           
            return redirect()->to(base_url('app/students/edit/'.$id.'?active=2'));
        } else {
            $this->data['universities'] = array_column($this->university_model->get()->getResultArray(),'title','id');
            $this->data['consultants'] = array_column($this->users_model->get(['role_id' => 6], ['id', 'name'])->getResultArray(),'name','id');
            $this->data['edit_data'] = $this->users_model->get_join(
                [
                    ['students', 'students.student_id = users.id'],
                ],
                ['users.id' => $id],
                [
                    'users.*', 'students.student_id','students.enrollment_id','students.application_id','students.dob','students.gender','students.address','students.consultant_id','students.fee','students.documents','students.admission_status','students.courses','students.course_status','students.attendance','students.midtermGrades','students.paymentStatus','students.finalGrades','students.creditHours','students.semester_details','students.gpa','students.referred_by'
                ]
            )->getRowArray();
            $this->data['courses'] = array_column($this->course_model->get()->getResultArray(), 'title', 'id');
            return view('App/Academic/edit', $this->data);
        }
    }
    
    public function delete($id){
        if ($id > 0){
            if ($this->users_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Student Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('app/students/index'));
    }
    public function view($id)
    {
        $this->data['universities'] = array_column($this->university_model->get()->getResultArray(),'title','id');
         $this->data['country_code'] = get_country_code();
         $this->data['consultants'] = array_column($this->users_model->get(['role_id' => 6], ['id', 'name'])->getResultArray(),'name','id');
        $this->data['view_data'] = $this->users_model->get_join(
            [
                ['students', 'students.student_id = users.id'],
            ],
            ['users.id' => $id],
            [
                'users.*', 'students.student_id','students.enrollment_id','students.application_id','students.consultant_id','students.admission_status','students.courses','students.course_status','students.attendance','students.midtermGrades','students.paymentStatus','students.finalGrades'
            ]
        )->getRowArray();
        
        $this->data['courses'] = array_column($this->course_model->get()->getResultArray(), 'title', 'id');
        return view('App/Academic/view', $this->data);
    }
    
    public function get_courses($university_id) {
        if (empty($university_id) || !is_numeric($university_id)) {
            return json_encode(['error' => 'Invalid university ID']);
        }
        $courses = $this->course_model->get(['course.university_id' => $university_id],['id','title'])->getResultArray();
        return $this->response->setJSON($courses);
    }
    
    public function edit_qualification($id)
    {
        if ($this->request->getMethod() === 'post') {
            $qualifications = $this->request->getPost('qualification');
            $boards = $this->request->getPost('board');
            $percentages = $this->request->getPost('percentage');
            $files = $this->request->getFiles(); // Retrieve all files
            $update_successful = true;
    
            foreach ($qualifications as $key => $qualification) {
                $data = [
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
                $update_result = $this->qualification_model->edit($data, [
                    'student_id' => $id,
                    'qualification' => $qualification,
                ]);
    
                if (!$update_result) {
                    $update_successful = false;
                    break;
                }
            }
    
            // Set flash messages
            if ($update_successful) {
                session()->setFlashdata('message_success', "Student Qualification Updated Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong while updating qualification details! Try Again.");
            }
    
            return redirect()->to(base_url('app/students/edit/'.$id.'?active=3'));
        }
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
                'student_id' => $id,
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

        return redirect()->to(base_url('app/students/edit/'.$id.'?active=3'));
    }
    
     public function edit_payment($id)
    {
        if ($this->request->getMethod() === 'post') {
              echo "<pre>"; print_r( $this->request->getPost()); exit;
            $qualifications = $this->request->getPost('qualification');
            $boards = $this->request->getPost('board');
            $percentages = $this->request->getPost('percentage');
            $files = $this->request->getFiles(); // Retrieve all files
            $update_successful = true;
    
            foreach ($qualifications as $key => $qualification) {
                $data = [
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
                $update_result = $this->qualification_model->edit($data, [
                    'student_id' => $id,
                    'qualification' => $qualification,
                ]);
    
                if (!$update_result) {
                    $update_successful = false;
                    break;
                }
            }
    
            // Set flash messages
            if ($update_successful) {
                session()->setFlashdata('message_success', "Student Qualification Updated Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong while updating qualification details! Try Again.");
            }
    
            return redirect()->to(base_url('app/students/edit/'.$id.'?active=4'));
        }
    }

}
