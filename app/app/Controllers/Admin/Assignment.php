<?php
namespace App\Controllers\Admin;
use App\Models\Assignment_model;
use App\Models\Assignment_submissions_model;
use App\Models\Users_model;
use App\Models\Course_model;
use App\Models\Cohorts_model;
use App\Models\Cohort_students_model;

class Assignment extends AppBaseController
{
    public function __construct()
    {
        parent::__construct();
        $this->assignment_model = new Assignment_model();
        $this->assignment_submissions_model = new Assignment_submissions_model();
        $this->users_model = new Users_model();
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->cohort_students_model = new Cohort_students_model();
        $this->cohorts_model = new Cohorts_model();
    }

    public function index(){
        

        if(is_instructor()){
            $this->data['list_items'] = $this->assignment_model->get_join(
                [
                    ['course', 'course.id = assignment.course_id', 'left'],
                    ['cohorts', 'cohorts.id = assignment.cohort_id', 'left'], // Join cohorts to get instructor
                ],
                [
                    'cohorts.instructor_id' => get_user_id() // Filter by current instructor
                ],
                [
                    'course.id as course_id',
                    'course.title as course_title',
                    'assignment.id',
                    'assignment.title',
                    'assignment.description',
                    'assignment.due_date',
                    'assignment.from_time',
                    'assignment.to_time',
                    'assignment.total_marks'
                ],
                ['assignment.created_at' => 'DESC']
            )->getResultArray();

            // Fetch submissions for each assignment
            foreach ($this->data['list_items'] as &$item) {
                $item['submissions'] = $this->assignment_model->get_submissions(['assignment_id' => $item['id']]);
            }

        }
        else{
            $this->data['list_items'] = $this->assignment_model->get_join(
                [
                    ['course', 'course.id = assignment.course_id','left'],
                ],[],['course.id as course_id','course.title as course_title','assignment.id','assignment.title','assignment.description','assignment.due_date','assignment.from_time','assignment.to_time','assignment.total_marks'],['assignment.created_at' => 'DESC']
            )->getResultArray();
            foreach ($this->data['list_items'] as &$item) {
                $item['submissions'] = $this->assignment_model->get_submissions(['assignment_id' => $item['id']]);
            }

        }

        $this->data['page_title']   = 'Assignment';
        $this->data['page_name']    = 'Assignment/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add()
    {
        $this->data['course'] = $this->course_model->get([],['id','title'])->getResultArray();
        echo view('Admin/Assignment/ajax_add', $this->data);
    }

    public function add(){
        
        $data = [
            
            'title'         => $this->request->getPost('title'),
            'course_id'     => $this->request->getPost('course_id') ?? null,
            'description'   => $this->request->getPost('description'),
            'total_marks'   => $this->request->getPost('total_marks'),
            'due_date'      => $this->request->getPost('due_date'),
            'from_time'     => $this->request->getPost('from_time'),
            'to_time'       => $this->request->getPost('to_time'),
            'instructions'  => $this->request->getPost('instruction'),
            'cohort_id'     => $this->request->getPost('cohort_id') ?? null,
            'created_at'    => date('Y-m-d H:i:s'),
            'created_by'    => get_user_id(),
        ];
        
                $uploadedFileName = $this->request->getPost('uploadedFileName'); // Retrieve uploaded filename from hidden input
                      if(!empty($uploadedFileName))
                      {
                        $data['file'] = $uploadedFileName;
                      }
        
       
        $this->assignment_model->add($data);

        //  <div class=\"cta-section\">
        //     <a href=\"{$activity_link}\" class=\"cta-button\">Access Activity</a>
        // </div>



        // Send email to cohort students if cohort_id is set
        if (!empty($data['cohort_id'])) {
            $cohort_id = $data['cohort_id'];
            $cohort = $this->cohorts_model->get(['id' => $cohort_id])->getRowArray();
            $subject_name = $cohort['title'] ?? '';
            $student_ids = array_column($this->cohort_students_model->get(['cohort_id' => $cohort_id])->getResultArray(), 'user_id');
            if ($student_ids) {
                $students = $this->users_model->get(['id' => $student_ids])->getResultArray();
                
                $token = array_column($students, 'notification_token');
            
            
                $token = array_filter($token, function ($value) {
                    return !is_null($value) && $value !== '';
                });
                $token = array_chunk($token, 800);
    
                foreach ($token as $tk){
                    sendNotification("New Activity Added ","New Activity Added to Your Cohort – {$subject_name}", $tk);
                }
            
                $activity_link = base_url('login/index'); // Replace with actual activity link if available
                foreach ($students as $student) {
                    $subject = "New Activity Added to Your Cohort – {$subject_name}";
                    $body = "<!DOCTYPE html>
                        <html lang=\"en\">
                        <head>
                            <meta charset=\"UTF-8\">
                            <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                            <title>New Activity Added</title>
                            <style>
                                * { margin: 0; padding: 0; box-sizing: border-box; }
                                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2d3748; background-color: #f7fafc; }
                                .email-container { max-width: 650px; margin: 20px auto; background: #ffffff; overflow: hidden; width: 100%; }
                                .top-accent { height: 5px; background: linear-gradient(to right, #8B5CF6, #F59E0B, #8B5CF6); }
                                .header { position: relative; padding: 40px; text-align: center; background: #8B5CF6; }
                                .header::after { content: ''; position: absolute; bottom: -20px; left: 0; right: 0; height: 40px; background: #8B5CF6; transform: skewY(-2deg); }
                                .logo-wrapper { position: relative; z-index: 1; display: inline-block; padding: 20px 40px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                                .logo { max-width: 150px; height: auto; }
                                .content { position: relative; padding: 60px 40px 40px; background: white; }
                                .notification-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; margin-bottom: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
                                .tag { display: inline-block; padding: 6px 12px; background: rgba(139,92,246,0.1); color: #8B5CF6; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
                                .message-content { color: #4a5568; font-size: 16px; line-height: 1.8; }
                                .cta-section { text-align: center; margin: 30px 0; }
                                .cta-button { display: inline-block; padding: 16px 40px; background: #F59E0B; color: white !important; text-decoration: none !important; border-radius: 8px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 6px rgba(245,158,11,0.2); }
                                .cta-button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(245,158,11,0.3); }
                                .info-grid { margin-top: 40px; display: flex; flex-wrap: wrap; gap: 20px; }
                                .info-box { position: relative; background: #f8faf9; padding: 25px; border-radius: 12px; flex: 1 1 calc(50% - 10px); margin-bottom: 10px; min-width: 0; }
                                .info-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #8B5CF6; margin-bottom: 10px; font-weight: 600; }
                                .info-content { font-size: 15px; color: #4a5568; }
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
                                <div class=\"header\">
                                    <div class=\"logo-wrapper\">
                                        <img src=\"" . base_url(get_file(get_site_logo())) . "\" alt=\"TTII Logo\" class=\"logo\">
                                    </div>
                                </div>
                                <div class=\"content\">
                                    <div class=\"notification-card\">
                                        <div class=\"tag\">New Activity Added</div>
                                        <div class=\"message-content\">
                                            <p>Dear {$student['name']},</p>
                                            <br>
                                            <p>A new interactive activity has been added to your cohort for the subject <strong>{$subject_name}</strong> on the Teachers' Training Institute of India Learning Management System (LMS).</p>
                                            <p>We encourage you to participate actively to enhance your learning experience.</p>
                                        </div>
                                    </div>
                                   
                                    <div class=\"info-grid\">
                                        <div class=\"info-box\">
                                            <div class=\"info-label\">Phone</div>
                                            <div class=\"info-content\">(+91) 9747 400 111</div>
                                        </div>
                                        <div class=\"info-box\">
                                            <div class=\"info-label\">Email</div>
                                            <div class=\"info-content\">support@teachersindia.in</div>
                                        </div>
                                        <div class=\"info-box\" style=\"flex: 1 1 100%;\">
                                            <div class=\"info-label\">Address</div>
                                            <div class=\"info-content\">Teachers' Training Institute of India<br>2nd floor, Kannattu Building,<br>Opposite Holiday Inn Hotel,<br>Chakkaraparambu, NH 66 Ernakulam,<br>Kerala-682032</div>
                                        </div>
                                    </div>
                                </div>
                                <div class=\"footer\">
                                    <p class=\"footer-text\">© 2025 Teachers' Training Institute of India</p>
                                    <div class=\"divider\"></div>
                                    <p class=\"footer-text\">This email was sent to {$student['user_email']}</p>
                                </div>
                            </div>
                        </body>
                        </html>";
                    send_email_message($student['user_email'], $student['name'], $subject, $body, 'TTII Education');
                }
            }
        }
        
        if ($this->request->isAJAX()) {
            return $this->response->setJSON([
                'success' => true,
                'message' => 'Assignments Added successfully!'
            ]);
        } else {
            return redirect()->to(base_url('admin/assignment/index'));
        }

        // return redirect()->to(base_url('admin/assignment/index'));
    }

    public function ajax_edit($id){
        $this->data['course'] = $this->course_model->get([],['id','title'])->getResultArray();
        $this->data['edit_data'] = $this->assignment_model->get(['id' => $id])->getRowArray();

        echo view('Admin/Assignment/ajax_edit', $this->data);
    }

    public function edit($id){
        if ($this->request->getMethod() === 'post')
        {
            
            $data = [
                'title'         => $this->request->getPost('title'),
                'course_id'     => $this->request->getPost('course_id'),
                'description'   => $this->request->getPost('description'),
                'total_marks'   => $this->request->getPost('total_marks'),
                'due_date'      => $this->request->getPost('due_date'),
                'from_time'     => $this->request->getPost('from_time'),
                'to_time'       => $this->request->getPost('to_time'),
                'instructions'   => $this->request->getPost('instruction'),
                'updated_by'    => get_user_id(),
                'updated_at'    => date('Y-m-d H:i:s'),
            ];
            
            
                $uploadedFileName = $this->request->getPost('uploadedFileName'); // Retrieve uploaded filename from hidden input
                      if(!empty($uploadedFileName))
                      {
                        $data['file'] = $uploadedFileName;
                      }
        
            $response = $this->assignment_model->edit($data, ['id' => $id]);
            if ($response){
                session()->setFlashdata('message_success', "Assignment Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        if ($this->request->isAJAX()) {
            return $this->response->setJSON([
                'success' => true,
                'message' => 'Assignments updated successfully!'
            ]);
        } else {
            return redirect()->to(base_url('admin/assignment/index'));
        }
    }

    public function ajax_view($id){
        $this->data['view_data'] = $this->assignment_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Designation/ajax_view', $this->data);
    }

    public function delete($id)
    {
        // $id = $this->request->getPost('id');
        
        if ($id > 0){
            if ($this->assignment_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Assignment Deleted Successfully!");
                // return $this->response->setJSON([
                //     'success' => true,
                //     'message' => 'Assignment Deleted Successfully!'
                // ]);
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                // return $this->response->setJSON([
                //     'success' => false,
                //     'message' => 'Something went wrong! Try Again'
                // ]);
            }
        }else{
            session()->setFlashdata('message_danger', "Invalid ID! Try Again");
            // return $this->response->setJSON([
            //         'success' => false,
            //         'message' => 'Invalid ID!'
            // ]);
        }
        return redirect()->to(base_url('admin/assignment/index'));
    }
    
        
    public function upload_attachment()
    {
        $response = []; // Initialize response array

        if ($this->request->isAJAX()) 
        {
            $attachment = $this->upload_file('assignment', 'file');
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


    public function show_submission($assignment_id){
        $this->data['assignment'] = $this->assignment_model->get(['id' => $assignment_id])->getRowArray();
        $this->data['submissions'] = $this->assignment_model->get_submissions(['assignment_id' => $assignment_id]);
        
        $this->data['page_title']   = 'Assignment Submissions';
        $this->data['page_name']    = 'Assignment/submissions';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_edit_remarks($id){
        $this->data['edit_data'] = $this->assignment_submissions_model->get(['id' => $id])->getRowArray();
        $this->data['assignment_marks'] = $this->assignment_model->get(['id' => $this->data['edit_data']['assignment_id']])->getRowArray()['total_marks'] ?? 0;
        echo view('Admin/Assignment/ajax_edit_remarks', $this->data);
    }

    public function edit_remarks($submission_id){
        if ($this->request->getMethod() === 'post'){
            $data = [
                'marks' => $this->request->getPost('marks'),
                'remarks' => $this->request->getPost('remarks'),
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            $response = $this->assignment_submissions_model->edit($data, ['id' => $submission_id]);
            if ($response){
                session()->setFlashdata('message_success', "Remarks Updated Successfully!");
                $student_id = $this->assignment_submissions_model->get(['id' => $submission_id])->getRow()->user_id;
                $student_token = [];
                $student_token []= $this->users_model->get(['id' => $student_id])->getRow()->notification_token;
                sendNotification('Assignment Evaluated','Remarks  Updated Successfully!',$student_token);
                $assignment_id = $this->assignment_submissions_model->get(['id' => $submission_id])->getRowArray()['assignment_id'];
                $this->sendStudentEmail($student_id,$assignment_id,$data);
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        $assignment_id = $this->assignment_submissions_model->get(['id' => $submission_id])->getRowArray()['assignment_id'];
        
        $cohort_id = $this->assignment_model->get(['id' => $assignment_id])->getRowArray()['cohort_id'];

        return redirect()->to(base_url('admin/cohorts/view/'.$cohort_id));
        // return redirect()->to(base_url('admin/assignment/show_submission/'.$assignment_id));
    }

    private function sendStudentEmail($student_id, $assignment_id,$data){
        $student = $this->users_model->get(['id' => $student_id])->getRowArray();

        $assignment = $this->assignment_model
            ->get(['id' => $assignment_id])
            ->getRowArray();

        $subject = "Your Assignment Has Been Evaluated";

        $body = "<!DOCTYPE html>
        <html lang=\"en\">
        <head>
            <meta charset=\"UTF-8\">
            <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
            <title>Assignment Evaluated</title>
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
                .cta-button {
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
                    .cta-button { width: 100%; text-align: center; }
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
                                Your assignment has been successfully evaluated by the instructor.
                            </p>

                            <div class=\"highlight\">
                                <p><strong>Assignment:</strong> {$assignment['title']}</p>
                                <p><strong>Marks Awarded:</strong> {$data['marks']}</p>
                            </div>

                            <p>
                                Please log in to the LMS to view detailed feedback and remarks.
                            </p>

                            <p>
                                If you have any questions, feel free to contact us at
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

        send_email_message(
            $student['user_email'],
            $student['name'],
            $subject,
            $body,
            'TTII Education'
        );

    }

    public function delete_submitted_file($id){
        $assignment_id = $this->assignment_submissions_model->get(['id' => $id])->getRowArray()['assignment_id'];
        $response = $this->assignment_submissions_model->edit(['assignment_files' => null],['id' => $id]);
        if ($response){
            session()->setFlashdata('message_success', "Submitted File Deleted Successfully!");
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        $assignment_id = $this->assignment_submissions_model->get(['id' => $id])->getRowArray()['assignment_id'];
        
        $cohort_id = $this->assignment_model->get(['id' => $assignment_id])->getRowArray()['cohort_id'];

        $this->assignment_submissions_model->remove(['id' => $id]);

        return redirect()->to(base_url('admin/cohorts/view/'.$cohort_id));
    }

}
