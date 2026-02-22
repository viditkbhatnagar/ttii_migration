<?php
namespace App\Controllers\Admin;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Cohorts_model;
use App\Models\Cohort_students_model;
use App\Models\Languages_model;
use App\Models\Live_class_model;
use App\Models\Cohort_announcements_model;
use App\Models\Assignment_model;
use App\Models\Instructor_enrol_model;

class Cohorts extends AppBaseController
{
    protected $course_model;
    protected $users_model;
    protected $cohorts_model;
    protected $cohort_students_model;
    protected $languages_model;
    protected $live_class_model;
    protected $assignment_model;
    protected $cohort_announcements_model;
    protected $instructor_enrol_model;
    protected $db;

    public function __construct()
    {
        parent::__construct();
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->cohorts_model = new Cohorts_model();
        $this->cohort_students_model = new Cohort_students_model();
        $this->languages_model = new Languages_model();
        $this->live_class_model = new Live_class_model();
        $this->assignment_model = new Assignment_model();
        $this->cohort_announcements_model = new Cohort_announcements_model();
        $this->instructor_enrol_model = new Instructor_enrol_model();
        $this->db = \Config\Database::connect();
    }

    public function index(){
        
        $this->data['list_items'] = $this->cohorts_model->get()->getResultArray();
        $this->data['page_title'] = 'Cohorts';
        $this->data['page_name'] = 'Cohorts/index';
        return view('Admin/index', $this->data);
    }
    
    public function view($id){
        
        $this->data['list_items'] = $this->cohorts_model->get(['id' => $id])->getRowArray();
        $this->data['course'] = $this->course_model->get(['id' => $this->data['list_items']['course_id'],'status' => 'published'])->getRowArray();
        $this->data['language'] = $this->languages_model->get(['id' => $this->data['list_items']['language_id']])->getRowArray();
        $this->data['instructor'] = $this->users_model->get(['id' => $this->data['list_items']['instructor_id']])->getRowArray();
        $this->data['students'] = $this->cohort_students_model->get(['cohort_id' => $id])->getResultArray();
        
        foreach($this->data['students'] as $index => $student){
            $students = $this->users_model->get(['id' => $student['user_id']])->getRowArray();
            $this->data['students'][$index]['student_id'] = $students['student_id'];
            $this->data['students'][$index]['name'] = $students['name'];
            $this->data['students'][$index]['email'] = $students['user_email'];
        }
        // $this->data['live_class'] = $this->live_class_model->get()->getResultArray();
        // $this->data['assignments'] = $this->assignment_model->get()->getResultArray();
        $this->data['announcements'] = $this->cohort_announcements_model->get(['cohort_id' => $id])->getResultArray();
        
        $this->data['page_title'] = 'Cohort Details';
        $this->data['page_name'] = 'Cohorts/view';
        return view('Admin/index', $this->data);
    }
    
    public function cohort_add()
    {
        $this->data['cohort_id'] = $this->generateCohortId();
        $this->data['session_id'] = $this->generateSessionId();
        
        $this->data['course'] = $this->course_model->get(['status' => 'published'])->getResultArray();
        $this->data['language'] = $this->languages_model->get()->getResultArray();

        // get all the students
        // $this->data['students'] = $this->users_model->get(['role_id' => 2])->getResultArray();
        // get all the students who are not already in a cohort
        $this->data['students'] = $this->get_students_not_in_cohort();

        $this->data['zoom_id'] = get_settings('zoom_id');
        $this->data['zoom_password'] = get_settings('zoom_password');
        
        $this->data['page_title'] = 'Add Cohort';
        $this->data['page_name'] = 'Cohorts/cohort_add';
        return view('Admin/index', $this->data);
    }
    
    public function get_students_not_in_cohort()
    {
        return $this->db->table('users')
            ->select('users.*')
            ->join('cohort_students', 'users.id = cohort_students.user_id', 'left')
            ->where('users.role_id', 2)
            ->where('cohort_students.user_id IS NULL')
            ->get()
            ->getResultArray();
    }
    // public function ajax_add(){
    //     $this->data['course'] = $this->course_model->get()->getResultArray();
    //     $this->data['language'] = $this->languages_model->get()->getResultArray();
        
    //     $this->data['cohort_id'] = $this->generateCohortId();
    //     echo view('Admin/Cohorts/ajax_add', $this->data);
    // }

    public function add(){
        if ($this->request->getMethod() === 'post'){
            $data = [
                'title' => $this->request->getPost('title'),
                'cohort_id' => $this->request->getPost('cohort_id'),
                'course_id' => $this->request->getPost('course_id'),
                'subject_id' => $this->request->getPost('subject_id'),
                'language_id' => $this->request->getPost('language_id'),
                'instructor_id' => $this->request->getPost('instructor_id'),
                'start_date' => $this->request->getPost('start_date'),
                'end_date' => $this->request->getPost('end_date'),
                'created_by' => get_user_id(),
                'created_at' => date('Y-m-d H:i:s'),
            ];
            // if subject id already exists for the course
            if($this->cohorts_model->get(['course_id' => $data['course_id'], 'subject_id' => $data['subject_id']])->getRowArray()){
                return $this->response->setJSON([
                    'success' => false,
                    'message' => 'Cohort with this subject already exists for this course!'
                ]);
            }
            
            $inserted_id = $this->cohorts_model->add($data);
            if ($inserted_id){
                $this->send_cohort_mail_instructor($inserted_id);
                return $this->response->setJSON([
                    'success' => true,
                    'data' => ['cohort_id' => $inserted_id],
                    'message' => 'Cohort added successfully!'
                ]);
            }else{
                return $this->response->setJSON([
                    'success' => false,
                    'message' => 'Something went wrong! Try Again'
                ]);
            }
        }
    }
    
    public function cohort_edit($id)
    {
        
        $this->data['edit_data'] = $this->cohorts_model->get(['id' => $id])->getRowArray();
        
        $this->data['course'] = $this->course_model->get(['status' => 'published'])->getResultArray();
        $this->data['language'] = $this->languages_model->get()->getResultArray();
        
        // $this->data['instructor'] = $this->users_model->get(['id' => $this->data['list_items']['instructor_id']])->getRowArray();

        $this->data['students'] = $this->cohort_students_model->get(['cohort_id' => $id])->getResultArray();
        $assigned_user_ids = array_column($this->data['students'], 'user_id');
        
        $learners = $this->users_model->get(['role_id' => 2])->getResultArray();
        foreach ($this->data['students'] as $index => $student) {
            $user = $this->users_model->get(['id' => $student['user_id']])->getRowArray();
            if ($user) {
                $this->data['students'][$index]['student_id'] = $user['student_id'] ?? '';
                $this->data['students'][$index]['name'] = $user['name'] ?? '';
                $this->data['students'][$index]['email'] = $user['user_email'] ?? '';
            }
        }
        
        if (!empty($assigned_user_ids)) {
            $builder = $this->db->table('users');
            $builder->whereNotIn('id', $assigned_user_ids);
            $builder->where('role_id', 2);
            $learners = $builder->get()->getResultArray();
        }
        
        // get all the students
        // $this->data['students'] = $this->users_model->get(['role_id' => 2])->getResultArray();
        // get all the students who are not already in a cohort
        $this->data['learners'] = $this->get_students_not_in_cohort();

        // $this->data['learners'] = $learners;
        
        $this->data['live_class'] = $this->live_class_model->get(['cohort_id' => $id])->getResultArray();
        $this->data['assignments'] = $this->assignment_model->get_join([
                                                                            ['course', 'assignment.course_id = course.id']
                                                                        ],['cohort_id' => $id],
                                                                        ['assignment.*','course.title as course_title']
                                                                    )->getResultArray();
        $this->data['announcements'] = $this->cohort_announcements_model->get(['cohort_id' => $id])->getResultArray();
        
        $this->data['page_title'] = 'Cohort Edit';
        $this->data['page_name'] = 'Cohorts/cohort_edit';
        
        log_message('error',print_r($this->data,true));
        
        return view('Admin/index', $this->data);
        
    }

    public function ajax_edit($id){
        $this->data['edit_data'] = $this->cohorts_model->get(['id' => $id])->getRowArray();
        $this->data['course'] = $this->course_model->get(['status' => 'published'])->getResultArray();
        $this->data['language'] = $this->languages_model->get()->getResultArray();
        echo view('Admin/Cohorts/ajax_edit', $this->data);
    }

    public function edit($id){
        if ($this->request->getMethod() === 'post'){
            $data = [
                'title' => $this->request->getPost('title'),
                'cohort_id' => $this->request->getPost('cohort_id'),
                'course_id' => $this->request->getPost('course_id'),
                'subject_id' => $this->request->getPost('subject_id'),
                'language_id' => $this->request->getPost('language_id'),
                'instructor_id' => $this->request->getPost('instructor_id'),
                'start_date' => $this->request->getPost('start_date'),
                'end_date' => $this->request->getPost('end_date'),
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            $response = $this->cohorts_model->edit($data, ['id' => $id]);
            if ($response){
                $this->send_cohort_mail_instructor($id);
                return $this->response->setJSON([
                    'success' => true,
                    'message' => 'Cohort Updated successfully!'
                ]);
            }else{
                return $this->response->setJSON([
                    'success' => false,
                    'message' => 'Something went wrong! Try Again'
                ]);
            }
        }
    }
    
    public function add_live_class($cohort_id)
    {
        $this->data['session_id'] = $this->generateSessionId();
        $this->data['cohort_id'] = $cohort_id;
        $this->data['zoom_id'] = get_settings('zoom_id');
        $this->data['zoom_password'] = get_settings('zoom_password');
        
        echo view('Admin/Live_class/live_cohort_add', $this->data);
    }
    
    public function assignments_add($cohort_id)
    {
        $this->data['course'] = $this->course_model->get(['status' => 'published'])->getResultArray();
        $this->data['cohort_id'] = $cohort_id;
        
        echo view('Admin/Assignment/cohort_assignments_add', $this->data);
    }
    
    public function announcements_add($cohort_id)
    {
        $this->data['cohort_id'] = $cohort_id;
        
        echo view('Admin/Announcement/cohort_announcement_add', $this->data);
    }
    
    public function add_cohort_students()
    {
        if ($this->request->getMethod() === 'post') {
            $cohort_id = $this->request->getPost('cohort_id'); 
            $student_ids = $this->request->getPost('student_id'); 

            $inserted_id = [];
            foreach ($student_ids as $student_id) {
                $data = [
                    'cohort_id' => $cohort_id,
                    'user_id' => $student_id,
                    'created_by' => get_user_id(),
                    'created_at' => date('Y-m-d H:i:s'),
                ];
                $inserted_id[] = $this->cohort_students_model->add($data);
                
                $user = $this->users_model->get(['id' => $student_id], ['name', 'user_email', 'phone'])->getRow();
                if ($user->user_email) {
                    $this->send_cohort_mail($user, $cohort_id);
                }
            }
            
            return $this->response->setJSON([
                'success' => true,
                'message' => 'Learners added successfully!'
            ]);
        }
    }

    private function send_application_acknowledgement_email($user, $course_name, $intake)
    {
        $application_data = $this->application_model->get_join(
            [
                ['course', 'application.course_id = course.id'],
                ['batch', 'application.batch_id = batch.id'],
            ],
            ['application.application_id' => $application_id],
            ['application.*']
        )->getRowArray();
        // log_message('error',print_r($application_data),true);

        $subject = "Application Received - Teachers' Training Institute of India";

        // $instructor_id = $this->instructor_enrol_model->get(['course_id' => $cohort_data['course_id']])->getRow()->instructor_id;

        // $instructor_name = $cohort_data['instructor_name'] ?? '-';

        // $subject = 'Welcome to Your Cohort for ' . $cohort_data['subject_name'];

        $toEmail = $user->user_email;
        $toName = $user->name;

        $bodyContent = "<!DOCTYPE html>
            <html lang=\"en\">
            <head>
                <meta charset=\"UTF-8\">
                <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                <title>Welcome to Your Cohort</title>
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
                        background: linear-gradient(to right, rgb(237 119 29), #0a875c, rgb(237 119 29));
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
                        color: rgb(237 119 29);
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
                    .cohort-details {
                        background: #f8faf9;
                        padding: 20px;
                        border-radius: 12px;
                        margin: 20px 0;
                        border-left: 4px solid rgb(237 119 29);
                    }
                    .cohort-details h3 {
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
                    .login-button {
                        display: inline-block;
                        background: rgb(237 119 29);
                        color: white;
                        padding: 12px 30px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 600;
                        margin: 20px 0;
                        transition: background-color 0.3s;
                    }
                    .login-button:hover {
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
                                <p>Dear {$toName},</p>
                                <br>
                                <p>Welcome to the cohort for <strong>{$cohort_data['subject_name']}</strong> in the <strong>{$cohort_data['course_name']}</strong>.</p>

                                <div class=\"cohort-details\">
                                    <h3>Cohort Details:</h3>
                                    <div class=\"detail-item\">
                                        • <span class=\"detail-label\">Subject:</span> 
                                        <span class=\"detail-value\">{$cohort_data['subject_name']}</span>
                                    </div>
                                    <div class=\"detail-item\">
                                        • <span class=\"detail-label\">Instructor:</span> 
                                        <span class=\"detail-value\">{$instructor_name}</span>
                                    </div>
                                    <div class=\"detail-item\">
                                        • <span class=\"detail-label\">Course Duration:</span> 
                                        <span class=\"detail-value\">{$cohort_data['start_date']} to {$cohort_data['end_date']}</span>
                                    </div>
                                </div>
                                
                                <p>You can access your course materials and stay updated through our LMS.</p>
                                <br>
                                <div style=\"text-align: center;\">
                                    <a href=\"" . base_url('login/index') . "\" class=\"login-button\">Login URL</a>
                                </div>
                                <br>
                                <p>If you have any questions or need assistance, please contact us at <a href=\"mailto:support@teachersindia.in\" style=\"color: rgb(237 119 29);\">support@teachersindia.in</a>.</p>
                                <br>
                                <p>We look forward to your active participation and wish you a successful learning experience!</p>
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
    
    private function send_cohort_mail($user, $cohort_id)
    {
        $cohort_data = $this->cohorts_model->get_join(
            [
                ['subject', 'cohorts.subject_id = subject.id'],
                ['course', 'cohorts.course_id = course.id'],
                ['users', 'cohorts.instructor_id = users.id'],
            ],
            ['cohorts.id' => $cohort_id],
            ['cohorts.*', 'subject.title as subject_name', 'course.title as course_name', 'users.name as instructor_name', 'users.user_email as instructor_email']
        )->getRowArray();

        $instructor_id = $this->instructor_enrol_model->get(['course_id' => $cohort_data['course_id']])->getRow()->instructor_id;

        $instructor_name = $cohort_data['instructor_name'] ?? '-';

        $subject = 'Welcome to Your Cohort for ' . $cohort_data['subject_name'];

        $toEmail = $user->user_email;
        $toName = $user->name;

        $bodyContent = "<!DOCTYPE html>
            <html lang=\"en\">
            <head>
                <meta charset=\"UTF-8\">
                <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                <title>Welcome to Your Cohort</title>
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
                        background: linear-gradient(to right, rgb(237 119 29), #0a875c, rgb(237 119 29));
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
                        color: rgb(237 119 29);
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
                    .cohort-details {
                        background: #f8faf9;
                        padding: 20px;
                        border-radius: 12px;
                        margin: 20px 0;
                        border-left: 4px solid rgb(237 119 29);
                    }
                    .cohort-details h3 {
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
                    .login-button {
                        display: inline-block;
                        background: rgb(237 119 29);
                        color: white;
                        padding: 12px 30px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 600;
                        margin: 20px 0;
                        transition: background-color 0.3s;
                    }
                    .login-button:hover {
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
                                <p>Dear {$toName},</p>
                                <br>
                                <p>Welcome to the cohort for <strong>{$cohort_data['subject_name']}</strong> in the <strong>{$cohort_data['course_name']}</strong>.</p>

                                <div class=\"cohort-details\">
                                    <h3>Cohort Details:</h3>
                                    <div class=\"detail-item\">
                                        • <span class=\"detail-label\">Subject:</span> 
                                        <span class=\"detail-value\">{$cohort_data['subject_name']}</span>
                                    </div>
                                    <div class=\"detail-item\">
                                        • <span class=\"detail-label\">Instructor:</span> 
                                        <span class=\"detail-value\">{$instructor_name}</span>
                                    </div>
                                    <div class=\"detail-item\">
                                        • <span class=\"detail-label\">Course Duration:</span> 
                                        <span class=\"detail-value\">{$cohort_data['start_date']} to {$cohort_data['end_date']}</span>
                                    </div>
                                </div>
                                
                                <p>You can access your course materials and stay updated through our LMS.</p>
                                <br>
                                <div style=\"text-align: center;\">
                                    <a href=\"" . base_url('login/index') . "\" class=\"login-button\">Login URL</a>
                                </div>
                                <br>
                                <p>If you have any questions or need assistance, please contact us at <a href=\"mailto:support@teachersindia.in\" style=\"color: rgb(237 119 29);\">support@teachersindia.in</a>.</p>
                                <br>
                                <p>We look forward to your active participation and wish you a successful learning experience!</p>
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

    private function send_cohort_mail_instructor($cohort_id)
    {
        $cohort_data = $this->cohorts_model->get_join(
            [
                ['subject', 'cohorts.subject_id = subject.id'],
                ['course', 'cohorts.course_id = course.id']
            ],
            ['cohorts.id' => $cohort_id],
            ['cohorts.*', 'subject.title as subject_name', 'course.title as course_name']
        )->getRowArray();

        $instructor = $this->users_model->get(['id' => $cohort_data['instructor_id']], ['name', 'user_email'])->getRow();
        $instructor_name = $instructor->name;
        
        $subject = 'New Cohort Created for Your Subject - ' . $cohort_data['subject_name'] . ' - TTII';

        $toEmail = $instructor->user_email;
        $toName = $instructor->name;

        $bodyContent = "<!DOCTYPE html>
            <html lang=\"en\">
            <head>
                <meta charset=\"UTF-8\">
                <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                <title>New Cohort Created</title>
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
                        background: linear-gradient(to right, rgb(237 119 29), #0a875c, rgb(237 119 29));
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
                        color: rgb(237 119 29);
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
                    .cohort-details {
                        background: #f8faf9;
                        padding: 20px;
                        border-radius: 12px;
                        margin: 20px 0;
                        border-left: 4px solid rgb(237 119 29);
                    }
                    .cohort-details h3 {
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
                    .login-button {
                        display: inline-block;
                        background: rgb(237 119 29);
                        color: white;
                        padding: 12px 30px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 600;
                        margin: 20px 0;
                        transition: background-color 0.3s;
                    }
                    .login-button:hover {
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
                                <p>Dear {$toName},</p>
                                <br>
                                <p>We are pleased to inform you that a new cohort has been successfully created for the subject <strong>{$cohort_data['subject_name']}</strong> as part of the <strong>{$cohort_data['course_name']}</strong>.</p>

                                <div class=\"cohort-details\">
                                    <h3>Cohort Details:</h3>
                                    <div class=\"detail-item\">
                                        • <span class=\"detail-label\">Subject:</span> 
                                        <span class=\"detail-value\">{$cohort_data['subject_name']}</span>
                                    </div>
                                    <div class=\"detail-item\">
                                        • <span class=\"detail-label\">Course:</span> 
                                        <span class=\"detail-value\">{$cohort_data['course_name']}</span>
                                    </div>
                                    <div class=\"detail-item\">
                                        • <span class=\"detail-label\">Duration:</span> 
                                        <span class=\"detail-value\">{$cohort_data['start_date']} to {$cohort_data['end_date']}</span>
                                    </div>
                                </div>
                                
                                <p>You can now begin managing this cohort through the LMS.</p>
                                <br>
                                <p>If you have any questions or need support, please contact us at <a href=\"mailto:support@teachersindia.in\" style=\"color: rgb(237 119 29);\">support@teachersindia.in</a>.</p>
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

        if(!empty($toEmail)){
            send_email_message($toEmail, $toName, $subject, $bodyContent, 'TTII Education');
        }
    }

    // private function send_cohort_mail($user, $cohort_id)
    // {
    //     $cohort_data = $this->cohorts_model->get(['id' => $cohort_id])->getRowArray();
    //     $subject = 'Welcome to Your New Cohort - ' . $cohort_data['title'];

    //     $toEmail = $user->user_email;
    //     $toName = $user->name;

    //     $bodyContent = "<!DOCTYPE html>
    //         <html lang=\"en\">
    //         <head>
    //             <meta charset=\"UTF-8\">
    //             <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    //             <title>Cohort Assignment Notification</title>
    //             <style>
    //                 * {
    //                     margin: 0;
    //                     padding: 0;
    //                     box-sizing: border-box;
    //                 }
    //                 body {
    //                     font-family: 'Segoe UI', Arial, sans-serif;
    //                     line-height: 1.6;
    //                     color: #2d3748;
    //                     background-color: #f7fafc;
    //                 }
    //                 .email-container {
    //                     max-width: 650px;
    //                     margin: 20px auto;
    //                     background: #ffffff;
    //                     overflow: hidden;
    //                 }
    //                 .top-accent {
    //                     height: 5px;
    //                     background: linear-gradient(to right, rgb(237 119 29), #0a875c, rgb(237 119 29));
    //                 }
    //                 .header {
    //                     position: relative;
    //                     padding: 10px;
    //                     text-align: center;
    //                     background: white;
    //                 }
    //                 .header::after {
    //                     content: '';
    //                     position: absolute;
    //                     bottom: -20px;
    //                     left: 0;
    //                     right: 0;
    //                     height: 40px;
    //                     background: white;
    //                     transform: skewY(-2deg);
    //                 }
    //                 .logo-wrapper {
    //                     position: relative;
    //                     z-index: 1;
    //                     display: inline-block;
    //                     padding: 20px 40px;
    //                     border-radius: 0 0 20px 20px;
    //                     box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    //                 }
    //                 .logo {
    //                     max-width: 150px;
    //                     height: auto;
    //                     font-size: 24px;
    //                     font-weight: bold;
    //                     color: rgb(237 119 29);
    //                 }
    //                 .content {
    //                     position: relative;
    //                     padding: 60px 40px 40px;
    //                     background: white;
    //                 }
    //                 .notification-card {
    //                     background: white;
    //                     border: 1px solid #e2e8f0;
    //                     border-radius: 16px;
    //                     padding: 30px;
    //                     margin-bottom: 30px;
    //                     box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    //                 }
    //                 .tag {
    //                     display: inline-block;
    //                     padding: 6px 12px;
    //                     background: rgb(237 119 29 / 28%);
    //                     color: rgb(237 119 29);
    //                     border-radius: 20px;
    //                     font-size: 12px;
    //                     font-weight: 600;
    //                     margin-bottom: 20px;
    //                 }
    //                 .message-content {
    //                     color: #4a5568;
    //                     font-size: 16px;
    //                     line-height: 1.8;
    //                 }
    //                 .cohort-highlight {
    //                     background: #f8faf9;
    //                     padding: 20px;
    //                     border-radius: 12px;
    //                     margin: 20px 0;
    //                     border-left: 4px solid rgb(237 119 29);
    //                 }
    //                 .cohort-name {
    //                     font-size: 18px;
    //                     font-weight: 600;
    //                     color: #2d3748;
    //                     margin-bottom: 5px;
    //                 }
    //                 .cohort-id {
    //                     font-size: 14px;
    //                     color: #718096;
    //                 }
    //                 .info-grid {
    //                     display: flex;
    //                     flex-wrap: wrap;
    //                     gap: 15px;
    //                     margin-top: 30px;
    //                 }
    //                 .info-box {
    //                     background: #f8faf9;
    //                     padding: 20px;
    //                     border-radius: 12px;
    //                     flex: 1 1 calc(50% - 10px);
    //                     min-width: 200px;
    //                 }
    //                 .info-label {
    //                     font-size: 12px;
    //                     text-transform: uppercase;
    //                     letter-spacing: 1px;
    //                     color: rgb(237 119 29);
    //                     margin-bottom: 8px;
    //                     font-weight: 600;
    //                 }
    //                 .info-content {
    //                     font-size: 15px;
    //                     color: #4a5568;
    //                 }
    //                 .footer {
    //                     background: #f8faf9;
    //                     padding: 30px;
    //                     text-align: center;
    //                     border-top: 1px solid #e2e8f0;
    //                 }
    //                 .footer-text {
    //                     color: #718096;
    //                     font-size: 14px;
    //                     margin: 5px 0;
    //                 }
    //                 .divider {
    //                     width: 60px;
    //                     height: 2px;
    //                     background: rgba(237,119,29,0.3);
    //                     margin: 15px auto;
    //                 }
    //                 @media only screen and (max-width: 600px) {
    //                     .email-container {
    //                         margin: 0;
    //                     }
    //                     .header, .content {
    //                         padding: 20px;
    //                     }
    //                     .logo-wrapper {
    //                         padding: 15px 30px;
    //                     }
    //                     .notification-card {
    //                         padding: 20px;
    //                     }
    //                     .info-grid {
    //                         flex-direction: column;
    //                     }
    //                     .info-box {
    //                         flex: 1 1 100%;
    //                     }
    //                 }
    //             </style>
    //         </head>
    //         <body>
    //             <div class=\"email-container\">
    //                 <div class=\"top-accent\"></div>
    //                 <div class=\"header\">
    //                     <div class=\"logo-wrapper\">
    //                         <div class=\"logo\">TTII</div>
    //                     </div>
    //                 </div>
                    
    //                 <div class=\"content\">
    //                     <div class=\"notification-card\">
    //                         <div class=\"tag\">Cohort Assignment</div>
    //                         <div class=\"message-content\">
    //                             <p>Dear $toName,</p>
    //                             <br>
    //                             <p>We are excited to inform you that you have been successfully added to a new cohort. You can now access resources and participate with your fellow cohort members.</p>
                                
    //                             <div class=\"cohort-highlight\">
    //                                 <div class=\"cohort-name\">{$cohort_data['title']}</div>
    //                                 <div class=\"cohort-id\">Cohort ID: {$cohort_data['cohort_id']}</div>
    //                             </div>
                                
    //                             <p>If you have any questions or need assistance, please feel free to reach out to us.</p>
    //                         </div>
    //                     </div>
                        
    //                     <div class=\"info-grid\">
    //                         <div class=\"info-box\">
    //                             <div class=\"info-label\">Phone</div>
    //                             <div class=\"info-content\">(+91) 9747 400 111</div>
    //                         </div>
    //                         <div class=\"info-box\">
    //                             <div class=\"info-label\">Email</div>
    //                             <div class=\"info-content\">info@ttii.com</div>
    //                         </div>
    //                     </div>
    //                 </div>
                    
    //                 <div class=\"footer\">
    //                     <p class=\"footer-text\">Best regards,<br><strong>TTII Team</strong></p>
    //                     <div class=\"divider\"></div>
    //                     <p class=\"footer-text\">© 2025 TTII Education Pvt Ltd.</p>
    //                     <p class=\"footer-text\">This email was sent to $toEmail</p>
    //                 </div>
    //             </div>
    //         </body>
    //         </html>";

    //     send_email_message($toEmail, $toName, $subject, $bodyContent, 'TTII Education');
    // }
    
    public function add_cohort_announcements()
    {
        if ($this->request->getMethod() === 'post') {
            $data = [
                'cohort_id' => $this->request->getPost('cohort_id'),
                'title' => $this->request->getPost('title'),
                'content' => $this->request->getPost('content'),
                'description' => $this->request->getPost('description')
            ];
            $response = $this->cohort_announcements_model->add($data);
            
            return $this->response->setJSON([
                'success' => true,
                'message' => 'Announcements added successfully!'
            ]);
        }
    }
    
    public function delete_cohort_student()
    {
        $id = $this->request->getPost('id'); 
        $cohortId = $this->request->getPost('cohort_id'); 
    
        if ($id > 0) {
            if ($this->cohort_students_model->remove(['id' => $id])) {
                return $this->response->setJSON([
                    'success' => true,
                    'message' => 'Deleted Successfully!',
                    'id' => $id
                ]);
            } else {
                return $this->response->setJSON([
                    'success' => false,
                    'message' => 'Something went wrong! Try Again',
                ]);
            }
        } else {
            return $this->response->setJSON([
                'success' => false,
                'message' => 'Invalid ID!',
            ]);
        }
    }

    public function delete($id){
        if ($id > 0){
            if ($this->cohorts_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/cohorts/index'));
    }
    
    public function delete_cohort_announcement()
    {
        $id = $this->request->getPost('id'); 
    
        if ($id > 0) {
            if ($this->cohort_announcements_model->remove(['id' => $id])) {
                return $this->response->setJSON([
                    'success' => true,
                    'message' => 'Deleted Successfully!'
                ]);
            } else {
                return $this->response->setJSON([
                    'success' => false,
                    'message' => 'Something went wrong! Try Again'
                ]);
            }
        } else {
            return $this->response->setJSON([
                'success' => false,
                'message' => 'Invalid ID!',
            ]);
        }
    }
    
    public function generateCohortId()
    {
        $latestCohort =$this->cohorts_model->get([],['cohort_id'],['id','desc'])->getRowArray();
        
        if(empty($latestCohort))
        {
            $latestCohort = '';
        }
        
        $newId = $latestCohort ? intval(substr($latestCohort['cohort_id'], -4)) + 1 : 1001;
        return 'C-' . str_pad($newId, 4, '0', STR_PAD_LEFT);
    }
    
    public function generateSessionId()
    {
        $latestCohort =$this->live_class_model->get([],['session_id'],['id','desc'])->getRowArray();
        
        if(empty($latestCohort))
        {
            $latestCohort = '';
        }
        
        $newId = $latestCohort ? intval(substr($latestCohort['session_id'], -4)) + 1 : 1001;
        return 'LS-' . str_pad($newId, 4, '0', STR_PAD_LEFT);
    }
    

}
