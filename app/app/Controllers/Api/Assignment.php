<?php
//File: app/Controllers/Api/Home.php

namespace App\Controllers\Api;


use App\Controllers\Api\Api;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Assignment_model;
use App\Models\Saved_assignments_model;
use App\Models\Assignment_submissions_model;
use App\Models\Cohort_students_model;
use App\Models\Subject_model;
use App\Models\Instructor_enrol_model;

class Assignment extends Api
{
    private $users_model;
    public function __construct()
    {
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->assignment_model = new Assignment_model();  
        $this->saved_assignments_model = new Saved_assignments_model();   
        $this->assignment_submissions_model = new Assignment_submissions_model();    
        $this->cohort_students_model = new Cohort_students_model(); 
        $this->subject_model = new Subject_model();
        $this->instructor_enrol_model = new Instructor_enrol_model();


    }
    
    
    public function index()
    {
        $this->is_valid_request(['GET']);
        // $course_id = $this->request->getGet('course_id');
        $subject_id = $this->request->getGet('subject_id');
        $cohort_id = $this->request->getGet('cohort_id');        

        if(!empty($cohort_id))
        {

            /*********************************** Single cohort only */


            
            // $cohort = $this->cohort_students_model->get_join([   
            //                                                 ['cohorts','cohorts.id = cohort_students.cohort_id'],
            //                                             ],
            //                                             ['user_id' => $this->user_id],
            //                                             [   'cohort_students.cohort_id as cohort_id',
            //                                                 'cohorts.title as cohort_title',
            //                                                 'cohorts.cohort_id as cohort_code',
            //                                                 'cohorts.start_date as cohort_start_date',
            //                                                 'cohorts.end_date as cohort_end_date',
            //                                             ])->getRowArray();
    
            $assignments = $this->assignment_model->get_user_assignments(
                            $cohort_id,
                            $this->user_id,
                            $subject_id
                        );
        
            $current = [];
            $upcoming = [];
            $completed = [];
            
            
            // Classify assignments into categories based on their status
            foreach ($assignments as $ass) {
                if (strpos($ass['status'], 'Current') !== false) {
                    $current[] = $ass;
                }
                else if (strpos($ass['status'], 'Upcoming') !== false) {
                    $upcoming[] = $ass;
                }
                else {
                    $completed[] = $ass;
                }
            }

        }
        else{


            /*********************************** Multiple cohorts */  //aurura
            $current = [];
            $upcoming = [];
            $completed = [];

            $cohorts = $this->cohort_students_model->get_join([
                                                            ['cohorts','cohorts.id = cohort_students.cohort_id'],
                                                        ],
                                                        ['user_id' => $this->user_id],
                                                        [   'cohort_students.cohort_id as cohort_id',
                                                            'cohorts.title as cohort_title',
                                                            'cohorts.cohort_id as cohort_code',
                                                            'cohorts.start_date as cohort_start_date',
                                                            'cohorts.end_date as cohort_end_date',
                                                            'cohorts.subject_id as subject_id'
                                                        ])->getResultArray();


            /***************************** Filter by subject (if provided) */
            //  STEP 1: convert cloned subject → real subject
            $real_subject_id = null;

            if (!empty($subject_id)) {
                $sub = $this->subject_model->get(['id' => $subject_id])->getRowArray();
                $real_subject_id = (!empty($sub['master_subject_id'])) ? $sub['master_subject_id'] : $subject_id;
            }


            //  STEP 2: filter cohorts by real subject ID
            if (!empty($real_subject_id)) {
                $cohorts = array_filter($cohorts, function($c) use ($real_subject_id) {
                    return $c['subject_id'] == $real_subject_id;
                });
            }


            /*******************************    */



            foreach ($cohorts as $cohort) {
                $assignments = $this->assignment_model->get_user_assignments(
                            $cohort['cohort_id'],
                            $this->user_id,
                            $subject_id
                        );
                    foreach ($assignments as $ass) {
                        if (strpos($ass['status'], 'Current') !== false) {
                            $current[] = $ass;
                        }
                        else if (strpos($ass['status'], 'Upcoming') !== false) {
                            $upcoming[] = $ass;
                        }
                        else {
                            $completed[] = $ass;
                        }
                    }
            }                                            

        }


        $data = [
                    'completed' => $completed,
                    'current' => $current,
                    'upcoming' => $upcoming
                ];
        
        
        
        $this->response_data = ['status' => 1,'message' => 'succesfully' , 'data' => $data];
        return $this->set_response();
    }
    
    
       /*** Event Details ***/
    public function get_assignment_details()
    {
        $this->is_valid_request(['GET']);
        
        $assignment_id = $this->request->getGet('assignment_id');

        $assignment = $this->assignment_model->get(['id' => $assignment_id])->getRowArray();
        $assignment_data = [];
        
        if(!empty($assignment))
        {
            $assignment_data = $this->assignment_model->assignment_data($assignment,$this->user_id);
        }
        else
        {
            return $this->response->setJSON([
                'status' => 'error',
                'message' => 'Assignment not found'
            ]);
        }
        

        return $this->response->setJSON([
            'status' => 'success',
            'data' => $assignment_data
        ]);
    }
    
    
    public function submit_assignment()
    {
        ini_set('memory_limit', '256M');
        $this->is_valid_request(['POST']);
        $assignment_id = $this->request->getPost('assignment_id');
        if(empty($assignment_id)){
            return $this->response->setJSON([
                    'status'  => 0,
                    'message' => 'Missing Assignment id.'
                ]);
        }
        $check_already  = $this->assignment_submissions_model->get(['user_id' => $this->user_id, 'assignment_id' => $assignment_id])->getNumRows();


        if(empty($check_already))
        {
            $data = [
                'user_id'       => $this->user_id,
                'cohort_id'     => $this->assignment_model->get(['id' => $this->request->getPost('assignment_id')])->getRow()->cohort_id,
                'assignment_id' => $this->request->getPost('assignment_id'),
                'course_id'     => $this->assignment_model->get(['id' => $this->request->getPost('assignment_id')])->getRow()->course_id,
                'created_by'    => $this->user_id,
                'created_at'    => date('Y-m-d H:i:s'),
            ];

            // Safety check
            if (
                empty($data['assignment_id']) || 
                //empty($data['course_id']) || 
                empty($data['user_id'])
            ) {
                return $this->response->setJSON([
                    'status'  => 0,
                    'message' => 'Missing required fields.'
                ]);
            }
                        
             if (isset($_FILES['answer_file']) && !empty($_FILES['answer_file']['name'][0])) 
             {
                $uploaded_files = $this->upload_file_multiple('assignment/answers', 'answer_file');
                
                
                // Extract only the 'file' values
                $filePaths = array_column($uploaded_files, 'file');
                
                // Convert to JSON
                $jsonFiles = json_encode($filePaths);
                $data['assignment_files'] = $jsonFiles;
            }
            
            $user_screenshot_id = $this->assignment_submissions_model->add($data);
            // log_message('error',print_r(get_last_query(),true));
            
            if($user_screenshot_id > 0){ 
                $this->response_data = ['status' => 1,'message' => 'success' , 'data' => []];

                    // Fetch assignment, student, instructor, and course/subject details
                    $assignment = $this->assignment_model->get(['id' => $this->request->getPost('assignment_id')])->getRowArray();
                    $student = $this->users_model->get(['id' => $this->user_id])->getRowArray();
                    // $instructor = $this->instructor_enrol_model->get_join([['users', 'users.id = instructor_enrol.instructor_id']],['course_id' => $assignment['course_id']])->getRowArray();
                    $instructor = $this->users_model->get(['id' => $assignment['created_by']])->getRowArray();
                    $course = $this->course_model->get(['id' => $assignment['course_id']])->getRowArray();
                    $subject_name = $course['title'] ?? '';
                    $assignment_title = $assignment['title'] ?? '';
                    $login_url = base_url('login/index');

                    // <p><strong>Subject:</strong> {$subject_name}</p>

                    // Student email
                    $student_subject = "Assignment Submission Successful – {$assignment_title}";
                    $student_body = "<!DOCTYPE html>
                        <html lang=\"en\">
                        <head>
                            <meta charset=\"UTF-8\">
                            <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                            <title>Assignment Submission Successful</title>
                            <style>
                                body {
                                    font-family: 'Segoe UI', Arial, sans-serif;
                                    background-color: #f7fafc;
                                    margin: 0;
                                    padding: 0;
                                    color: #2d3748;
                                }
                                .email-container {
                                    max-width: 650px;
                                    margin: 20px auto;
                                    background: #ffffff;
                                }
                                .top-accent {
                                    height: 5px;
                                    background: linear-gradient(to right, #8B5CF6, #0a875c, #8B5CF6);
                                }
                                .content {
                                    padding: 40px;
                                }
                                .card {
                                    background: #ffffff;
                                    border: 1px solid #e2e8f0;
                                    border-radius: 16px;
                                    padding: 30px;
                                    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                                }
                                .message {
                                    font-size: 16px;
                                    line-height: 1.8;
                                    color: #4a5568;
                                }
                                .highlight {
                                    background: #f8faf9;
                                    padding: 16px;
                                    border-left: 4px solid #8B5CF6;
                                    border-radius: 10px;
                                    margin: 20px 0;
                                }
                                .login-button {
                                    display: inline-block;
                                    background: #8B5CF6;
                                    color: #ffffff;
                                    padding: 12px 30px;
                                    text-decoration: none;
                                    border-radius: 8px;
                                    font-weight: 600;
                                    margin: 20px 0;
                                }
                                .footer {
                                    background: #f8faf9;
                                    padding: 25px;
                                    text-align: center;
                                    border-top: 1px solid #e2e8f0;
                                }
                                .footer-text {
                                    color: #718096;
                                    font-size: 14px;
                                    margin: 5px 0;
                                }

                                @media only screen and (max-width: 480px) {
                                    .content { padding: 25px 15px; }
                                    .card { padding: 20px; }
                                    .message { font-size: 14px; }
                                    .login-button { width: 100%; text-align: center; }
                                }
                            </style>
                        </head>

                        <body>
                            <div class=\"email-container\">
                                <div class=\"top-accent\"></div>

                                <div class=\"content\">
                                    <div class=\"card\">
                                        <div class=\"message\">
                                            <p>Dear {$student['name']},</p>

                                            <p>
                                                We have successfully received your assignment submission.
                                            </p>

                                            <div class=\"highlight\">
                                                <p><strong>Assignment:</strong> {$assignment_title}</p>
                                            </div>

                                            <p>
                                                Thank you for submitting your work.
                                            </p>

                                            <p>
                                                If you have any questions or need assistance, feel free to contact us at
                                                <a href=\"mailto:support@teachersindia.in\" style=\"color:#8B5CF6;\">
                                                    support@teachersindia.in
                                                </a>.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div class=\"footer\">
                                    <p class=\"footer-text\">
                                        Best regards,<br>
                                        <strong>Teachers' Training Institute of India</strong>
                                    </p>
                                    <p class=\"footer-text\">© " . date('Y') . " Teachers' Training Institute of India</p>
                                </div>
                            </div>
                        </body>
                        </html>";

                    send_email_message($student['user_email'], $student['name'], $student_subject, $student_body, 'TTII Education');

                    // Instructor email
                    $instructor_subject = "Assignment Submitted by Learner – {$assignment_title}";
                    $instructor_body = "<!DOCTYPE html>
                        <html lang=\"en\">
                        <head>
                            <meta charset=\"UTF-8\">
                            <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                            <title>Assignment Submitted by Learner</title>
                            <style>
                                * { margin: 0; padding: 0; box-sizing: border-box; }
                                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2d3748; background-color: #f7fafc; }
                                .email-container { max-width: 650px; margin: 20px auto; background: #ffffff; overflow: hidden; }
                                .top-accent { height: 5px; background: linear-gradient(to right, #8B5CF6, #0a875c, #8B5CF6); }
                                .content { position: relative; padding: 60px 40px 40px; background: white; }
                                .notification-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; margin-bottom: 30px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
                                .message-content { color: #4a5568; font-size: 16px; line-height: 1.8; }
                                .login-button { display: inline-block; background: #8B5CF6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; transition: background-color 0.3s; }
                                .login-button:hover { background: rgb(217 99 9); }
                                .footer { background: #f8faf9; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
                                .footer-text { color: #718096; font-size: 14px; margin: 5px 0; }
                                .divider { width: 60px; height: 2px; background: rgba(139,92,246,0.2); margin: 15px auto; }
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
                                            <p>Dear {$instructor['name']},</p>
                                            <br>
                                            <p>This is to inform you that <strong>{$student['name']}</strong> has submitted the assignment titled <strong>{$assignment_title}</strong> for the subject <strong>{$subject_name}</strong>.</p>
                                            <p>You can review the submission by logging into the LMS here:</p>
                                            <div style=\"text-align: center;\">
                                                <a href=\"{$login_url}\" class=\"login-button\">Login URL</a>
                                            </div>
                                            <p>If you need any assistance, please contact <a href=\"mailto:support@teachersindia.in\" style=\"color: #8B5CF6;\">support@teachersindia.in</a>.</p>
                                        </div>
                                    </div>
                                </div>
                                <div class=\"footer\">
                                    <p class=\"footer-text\">Best regards,<br><strong>Teachers' Training Institute of India</strong></p>
                                    <div class=\"divider\"></div>
                                    <p class=\"footer-text\">© 2025 Teachers' Training Institute of India</p>
                                </div>
                            </div>
                        </body>
                        </html>";
                    send_email_message($instructor['user_email'], $instructor['name'], $instructor_subject, $instructor_body, 'TTII Education');
                }else{
                    $this->response_data = ['status' => false,'message' => 'Something Went Wrong' , 'data' => []];
                }
        }
        else
        {
            $this->response_data = ['status' => false,'message' => 'Assignment already submitted' , 'data' => []];
        }
       
       
        
        return $this->set_response();
    }
    
    
    /*** Save Assignment ***/
    public function save_assignment()
    {
        $this->is_valid_request(['GET']);
        
        $assignment_id = $this->request->getGet('assignment_id');

        $assignment = $this->saved_assignments_model->get(['assignment_id' => $assignment_id,'user_id' => $this->user_id])->getRowArray();
        
        if(!empty($assignment))
        {
            $this->saved_assignments_model->remove(['assignment_id' => $assignment_id,'user_id' => $this->user_id]);
            
              return $this->response->setJSON([
                    'status' => 'Successfully Removed from saved Assignments',
                    'data' => $assignment_data
                ]);
            
        }
        else
        {
            $data = [
                    'user_id' => $this->user_id,
                    'assignment_id' => $assignment_id,
                    'created_by' => $this->user_id,
                    'created_at' => date('Y-m-d H:i:s')
                    ];
            
             $saved_id = $this->saved_assignments_model->add($data);
             
            return $this->response->setJSON([
                'status' => 'Successfully Saved',
                'data' => []
            ]);

        }
        

      
    }
    
 
    


}
