<?php

namespace App\Controllers;

use App\Models\Users_model;
use App\Entities\User;
use App\Models\Course_model;
use App\Models\Role_model;
use App\Models\Live_class_model;
use App\Models\Cohort_students_model;
use App\Models\Live_class_reminders_model;
use App\Models\Assignment_model;
use App\Models\Assignment_reminders_model;
use App\Models\Cohorts_model;   
use App\Models\Notification_model;
use App\Models\Payment_reminders_model;
use App\Models\Student_fee_model;

class Home extends BaseController
{
    private $user;
    private $role_model;
    private $live_class_model;
    private $users_model;
    private $course_model;
    private $cohort_students_model;
    private $live_class_reminders_model;
    private $assignment_model;
    private $assignment_reminders_model;
    private $cohorts_model;
    private $notification_model;
    private $payment_reminders_model;
    private $student_fee_model;
    public function __construct()
    {
        $this->user = new User();
        $this->role_model = new Role_model();
        $this->live_class_model = new Live_class_model();
        $this->users_model = new Users_model();
        $this->course_model = new Course_model();
        $this->cohort_students_model = new Cohort_students_model();
        $this->live_class_reminders_model = new Live_class_reminders_model();
        $this->assignment_model = new Assignment_model();
        $this->assignment_reminders_model = new Assignment_reminders_model();
        $this->cohorts_model = new Cohorts_model();
        $this->notification_model = new Notification_model();
        $this->payment_reminders_model = new Payment_reminders_model();
        $this->student_fee_model = new Student_fee_model();
    }
    
  
  
    public function google_authentication(){
        echo "Authentication Started!";
    }

    public function google_authentication_success(){
        echo "Authentication Success!";
    }


    public function index()
    {
        if ($this->request->getMethod() === 'post') {
            $this->_action_login();
        }
        
        if (is_logged_in()) 
        {
            return redirect()->to(base_url('app/dashboard/index'));
        }
        else
        {
            return redirect()->to(base_url('login'));
        }
    }
    
    private function _action_login()
    {
        $logger = service('logger');
        $email = $this->request->getPost('email');
        $password = $this->request->getPost('password');
        $login = $this->users_model->login($email, $password);
        
        $logger->error('Database Error: ' . db_connect()->getLastQuery());
        
        if ($login['status'] == 1){
            $user = $login['user'];
            $user_role = $this->role_model->get(['id' => $user->role_id])->getRow()->name ?? '';
            //set session
            $session = session();
            $session->set([
                'user_id' => $user->id,
                'role_id' => $user->role_id,
                'role_title' => $user_role,
                'user_name' => $user->name,
                // 'user_profile' => $user->profile_picture,
                'user_email' => $user->email,
                'is_logged_in' => true,
                'logged_in_at' => time(),
                'site_title' => get_site_title(),
                'site_logo' => get_site_logo(),
            ]);
            $session->setFlashdata('message_success', "Welcome back! <b>{$user->name}</b>");
        }else{
            $this->data['error'] = $login['message'];
        }
    }
    
    
    public function privacy_policy(){
        echo view('Frontend/Privacy_policy/index');
    }
    
    public function logout() {
        $session = session();

        // Destroy the session
        $session->destroy();
    
        return redirect()->to(base_url('login'));
    }
    
    public function live_class_reminder_cron()
    {
        $now = new \DateTime();
        $tomorrow = (clone $now)->modify('+1 day')->format('Y-m-d');
        $now_date = $now->format('Y-m-d');
        $now_time_15min = $now->modify('+15 minutes')->format('H:i:00');

        // 1. Get all live classes for tomorrow (for 1 day before reminder)
        $classes_tomorrow = $this->live_class_model->get(['date' => $tomorrow])->getResultArray();

        // 2. Get all live classes starting in 15 minutes (for 15 min before reminder)
        $classes_15min = $this->live_class_model->get([
            'date' => $now_date,
            'fromTime' => $now_time_15min
        ])->getResultArray();
        // Helper to send reminders
        $send_reminders = function($classes, $type) {
            foreach ($classes as $class) {
                $subject_name = $class['title'];
                $topic = $class['title'];
                $date = date('d-m-Y', strtotime($class['date']));
                $time = date('h:i A', strtotime($class['fromTime'])) . ' - ' . date('h:i A', strtotime($class['toTime']));
                $join_link = '#'; // Replace with actual join link if available

                // Get instructor
                $instructor = $this->users_model->get(['id' => $class['instructor_id']])->getRowArray();

                // Get students
                $students = [];
                if ($class['live_type'] == 1 && $class['cohort_id']) { // group class
                    $student_ids = array_column($this->cohort_students_model->get(['cohort_id' => $class['cohort_id']])->getResultArray(), 'user_id');
                    if ($student_ids) {
                        $students = $this->users_model->get(['id' => $student_ids])->getResultArray();
                    }
                } elseif ($class['live_type'] == 2 && $class['student_id']) { // 1-to-1
                    $student = $this->users_model->get(['id' => $class['student_id']])->getRowArray();
                    if ($student) $students[] = $student;
                }

                // Send to students
                foreach ($students as $student) {
                    if (!$this->reminder_already_sent($class['id'], $student['id'], $type)) {
                        if ($type == '1day') {
                            $subject = "Reminder: Upcoming Live Class Tomorrow – {$subject_name}";
                            $body = $this->render_live_class_reminder_student_styled($student['name'], $subject_name, $topic, $date, $time, $join_link, '1day');
                        } else {
                            $subject = "Gentle Reminder: Class is About to Start – {$subject_name}";
                            $body = $this->render_live_class_reminder_student_styled($student['name'], $subject_name, $topic, $date, $time, $join_link, '15min');
                        }
                        send_email_message($student['user_email'], $student['name'], $subject, $body, 'TTII Education');
                        $this->log_reminder_sent($class['id'], $student['id'], $type);
                    }
                }

                // Send to instructor
                if ($instructor && !$this->reminder_already_sent($class['id'], $instructor['id'], $type)) {
                    if ($type == '1day') {
                        $subject = "Reminder: Live Class Scheduled for Tomorrow – {$subject_name}";
                        $body = $this->render_live_class_reminder_instructor_styled($instructor['name'], $subject_name, $topic, $date, $time, $join_link, '1day');
                    } else {
                        $subject = "Reminder: Live Class Starts in 15 Minutes – {$subject_name}";
                        $body = $this->render_live_class_reminder_instructor_styled($instructor['name'], $subject_name, $topic, $date, $time, $join_link, '15min');
                    }
                    send_email_message($instructor['user_email'], $instructor['name'], $subject, $body, 'TTII Education');
                    $this->log_reminder_sent($class['id'], $instructor['id'], $type);
                }
            }
        };

        // Send reminders
        $send_reminders($classes_tomorrow, '1day');
        $send_reminders($classes_15min, '15min');

        log_message('error', 'Live Class Reminders sent.');
    }

    // Check if reminder already sent
    private function reminder_already_sent($live_class_id, $user_id, $reminder_type)
    {
        $where = [
            'live_class_id' => $live_class_id,
            'user_id' => $user_id,
            'reminder_type' => $reminder_type
        ];
        return $this->live_class_reminders_model->get($where)->getNumRows() > 0;
    }

    // Log reminder as sent
    private function log_reminder_sent($live_class_id, $user_id, $reminder_type)
    {
        $data = [
            'live_class_id' => $live_class_id,
            'user_id' => $user_id,
            'reminder_type' => $reminder_type,
            'sent_at' => date('Y-m-d H:i:s'),
            'created_at' => date('Y-m-d H:i:s'),
        ];
        $this->live_class_reminders_model->add($data);
    }

    // Styled student reminder email
    private function render_live_class_reminder_student_styled($student_name, $subject_name, $topic, $date, $time, $join_link, $type)
    {
        $main_message = $type == '1day'
            ? "This is a friendly reminder that your live class for <strong>{$subject_name}</strong> is scheduled for tomorrow."
            : "This is a quick reminder that your live class for <strong>{$subject_name}</strong> will begin in 15 minutes.";
        $button_text = $type == '1day' ? 'Join Now' : 'Join Now';
        $tag_text = $type == '1day' ? 'Tomorrow\'s Class' : 'Starting Soon';
        
        return "<!DOCTYPE html>
            <html lang=\"en\">
            <head>
                <meta charset=\"UTF-8\">
                <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                <title>Live Class Reminder</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2d3748; background-color: #f7fafc; }
                    .email-container { max-width: 650px; margin: 20px auto; background: #ffffff; overflow: hidden; }
                    .top-accent { height: 5px; background: linear-gradient(to right, #8B5CF6, #0a875c, #8B5CF6); }
                    .header { position: relative; padding: 40px; text-align: center; background: #8B5CF6; }
                    .header::after { content: ''; position: absolute; bottom: -20px; left: 0; right: 0; height: 40px; background: #8B5CF6; transform: skewY(-2deg); }
                    .logo-wrapper { position: relative; z-index: 1; display: inline-block; padding: 20px 40px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                    .logo { max-width: 150px; height: auto; }
                    .content { position: relative; padding: 60px 40px 40px; background: white; }
                    .notification-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; margin-bottom: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
                    .tag { display: inline-block; padding: 6px 12px; background: rgba(8,104,69,0.1); color: #8B5CF6; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
                    .message-content { color: #4a5568; font-size: 16px; line-height: 1.8; }
                    .class-details { background: #f8faf9; padding: 25px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #8B5CF6; }
                    .cta-section { text-align: center; margin: 30px 0; }
                    .cta-button { display: inline-block; padding: 16px 40px; background: #8B5CF6; color: white !important; text-decoration: none !important; border-radius: 8px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 6px rgba(8,104,69,0.2); }
                    .cta-button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(8,104,69,0.3); }
                    .info-grid { margin-top: 40px; display: flex; flex-wrap: wrap; gap: 20px; }
                    .info-box { position: relative; background: #f8faf9; padding: 25px; border-radius: 12px; flex: 1 1 calc(50% - 10px); margin-bottom: 10px; }
                    .info-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #8B5CF6; margin-bottom: 10px; font-weight: 600; }
                    .info-content { font-size: 15px; color: #4a5568; }
                    .footer { background: #f8faf9; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
                    .footer-text { color: #718096; font-size: 14px; margin: 5px 0; }
                    .divider { width: 60px; height: 2px; background: rgba(8,104,69,0.2); margin: 15px auto; }
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
                            <div class=\"tag\">{$tag_text}</div>
                            <div class=\"message-content\">
                                <p>Dear {$student_name},</p>
                                <br>
                                <p>{$main_message}</p>
                                <div class=\"class-details\">
                                    <h3>Live Class Details</h3>
                                    <p><strong>Topic:</strong> {$topic}</p>
                                    <p><strong>Date:</strong> {$date}</p>
                                    <p><strong>Time:</strong> {$time}</p>
                                </div>
                                <p>Please make sure to join on time to benefit fully from the session.</p>
                            </div>
                        </div>
                        <div class=\"cta-section\">
                            <a href=\"{$join_link}\" class=\"cta-button\">{$button_text}</a>
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
                        <p class=\"footer-text\">This email was sent to {$student_name}</p>
                    </div>
                </div>
            </body>
            </html>";
    }

    // Styled instructor reminder email
    private function render_live_class_reminder_instructor_styled($instructor_name, $subject_name, $topic, $date, $time, $join_link, $type)
    {
        $main_message = $type == '1day'
            ? "This is a reminder that you have a live class scheduled tomorrow for the subject <strong>{$subject_name}</strong>."
            : "This is a reminder that your live class for <strong>{$subject_name}</strong> will begin in 15 minutes.";
        $button_text = $type == '1day' ? 'Join Now' : 'Join Now';
        $tag_text = $type == '1day' ? 'Tomorrow\'s Class' : 'Starting Soon';
        
        return "<!DOCTYPE html>
        <html lang=\"en\">
        <head>
            <meta charset=\"UTF-8\">
            <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
            <title>Live Class Reminder</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2d3748; background-color: #f7fafc; }
                .email-container { max-width: 650px; margin: 20px auto; background: #ffffff; overflow: hidden; }
                .top-accent { height: 5px; background: linear-gradient(to right, #8B5CF6, #0a875c, #8B5CF6); }
                .header { position: relative; padding: 40px; text-align: center; background: #8B5CF6; }
                .header::after { content: ''; position: absolute; bottom: -20px; left: 0; right: 0; height: 40px; background: #8B5CF6; transform: skewY(-2deg); }
                .logo-wrapper { position: relative; z-index: 1; display: inline-block; padding: 20px 40px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                .logo { max-width: 150px; height: auto; }
                .content { position: relative; padding: 60px 40px 40px; background: white; }
                .notification-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; margin-bottom: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
                .tag { display: inline-block; padding: 6px 12px; background: rgba(8,104,69,0.1); color: #8B5CF6; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
                .message-content { color: #4a5568; font-size: 16px; line-height: 1.8; }
                .class-details { background: #f8faf9; padding: 25px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #8B5CF6; }
                .cta-section { text-align: center; margin: 30px 0; }
                .cta-button { display: inline-block; padding: 16px 40px; background: #8B5CF6; color: white !important; text-decoration: none !important; border-radius: 8px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 6px rgba(8,104,69,0.2); }
                .cta-button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(8,104,69,0.3); }
                .info-grid { margin-top: 40px; display: flex; flex-wrap: wrap; gap: 20px; }
                .info-box { position: relative; background: #f8faf9; padding: 25px; border-radius: 12px; flex: 1 1 calc(50% - 10px); margin-bottom: 10px; }
                .info-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #8B5CF6; margin-bottom: 10px; font-weight: 600; }
                .info-content { font-size: 15px; color: #4a5568; }
                .footer { background: #f8faf9; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
                .footer-text { color: #718096; font-size: 14px; margin: 5px 0; }
                .divider { width: 60px; height: 2px; background: rgba(8,104,69,0.2); margin: 15px auto; }
                @media only screen and (max-width: 600px) {
                    .email-container { margin: 0; }
                    .header, .content { padding: 20px; }
                    .logo-wrapper { padding: 15px 30px; }
                    .notification-card { padding: 20px; }
                    .info-box { flex: 1 1 100%; }
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
                        <div class=\"tag\">{$tag_text}</div>
                        <div class=\"message-content\">
                            <p>Dear {$instructor_name},</p>
                            <br>
                            <p>{$main_message}</p>
                            <div class=\"class-details\">
                                <h3>Live Class Details</h3>
                                <p><strong>Topic:</strong> {$topic}</p>
                                <p><strong>Date:</strong> {$date}</p>
                                <p><strong>Time:</strong> {$time}</p>
                            </div>
                            <p>Please be prepared and join the session on time.</p>
                        </div>
                    </div>
                    <div class=\"cta-section\">
                        <a href=\"{$join_link}\" class=\"cta-button\">{$button_text}</a>
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
                    <p class=\"footer-text\">This email was sent to {$instructor_name}</p>
                </div>
            </div>
        </body>
        </html>";
    }
    
    public function assignment_due_reminder_cron()
    {
        $today = new \DateTime();
        $one_day = (clone $today)->modify('+1 day')->format('Y-m-d');
        $two_days = (clone $today)->modify('+2 days')->format('Y-m-d');

        // Get assignments due in 1 or 2 days
        $assignments_1day = $this->assignment_model->get(['due_date' => $one_day])->getResultArray();
        $assignments_2day = $this->assignment_model->get(['due_date' => $two_days])->getResultArray();

        $send_reminder = function($assignments, $reminder_type) {
            foreach ($assignments as $assignment) {
                $assignment_id = $assignment['id'];
                $assignment_title = $assignment['title'];
                $due_date = $assignment['due_date'];
                $cohort_id = $assignment['cohort_id'];
                $cohort = $this->cohorts_model->get(['id' => $cohort_id])->getRowArray();
                $subject_name = $cohort['title'] ?? '';
                $login_url = base_url('login/index');

                // Get all students in the cohort
                $student_ids = array_column($this->cohort_students_model->get(['cohort_id' => $cohort_id])->getResultArray(), 'user_id');
                if (!$student_ids) continue;
                $students = $this->users_model->get(['id' => $student_ids])->getResultArray();

                foreach ($students as $student) {
                    // Check if reminder already sent
                    $where = [
                        'assignment_id' => $assignment_id,
                        'user_id' => $student['id'],
                        'reminder_type' => $reminder_type
                    ];
                    if ($this->assignment_reminders_model->get($where)->getNumRows() > 0) continue;

                    $subject = "Reminder: Assignment Submission Due Soon – {$assignment_title}";
                    $body = $this->render_assignment_due_reminder_student_styled($student['name'], $subject_name, $assignment_title, $due_date, $login_url);
                    send_email_message($student['user_email'], $student['name'], $subject, $body, 'TTII Education');

                    // Log reminder as sent
                    $this->assignment_reminders_model->add([
                        'assignment_id' => $assignment_id,
                        'user_id' => $student['id'],
                        'reminder_type' => $reminder_type,
                        'sent_at' => date('Y-m-d H:i:s'),
                        'created_at' => date('Y-m-d H:i:s'),
                    ]);
                }
            }
        };

        $send_reminder($assignments_2day, '2day');
        $send_reminder($assignments_1day, '1day');

        log_message('error', 'Assignment Due Reminders sent.');
    }

    private function render_assignment_due_reminder_student_styled($student_name, $subject_name, $assignment_title, $due_date, $login_url)
    {
        return "<!DOCTYPE html>
        <html lang=\"en\">
        <head>
            <meta charset=\"UTF-8\">
            <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
            <title>Assignment Submission Reminder</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2d3748; background-color: #f7fafc; }
                .email-container { max-width: 650px; margin: 20px auto; background: #ffffff; overflow: hidden; }
                .top-accent { height: 5px; background: linear-gradient(to right, #8B5CF6, #0a875c, #8B5CF6); }
                .header { position: relative; padding: 40px; text-align: center; background: #8B5CF6; }
                .header::after { content: ''; position: absolute; bottom: -20px; left: 0; right: 0; height: 40px; background: #8B5CF6; transform: skewY(-2deg); }
                .logo-wrapper { position: relative; z-index: 1; display: inline-block; padding: 20px 40px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                .logo { max-width: 150px; height: auto; }
                .content { position: relative; padding: 60px 40px 40px; background: white; }
                .notification-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; margin-bottom: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
                .tag { display: inline-block; padding: 6px 12px; background: rgba(8,104,69,0.1); color: #8B5CF6; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
                .message-content { color: #4a5568; font-size: 16px; line-height: 1.8; }
                .assignment-details { background: #f8faf9; padding: 25px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #8B5CF6; }
                .cta-section { text-align: center; margin: 30px 0; }
                .cta-button { display: inline-block; padding: 16px 40px; background: #8B5CF6; color: white !important; text-decoration: none !important; border-radius: 8px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 6px rgba(8,104,69,0.2); }
                .cta-button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(8,104,69,0.3); }
                .info-grid { margin-top: 40px; display: flex; flex-wrap: wrap; gap: 20px; }
                .info-box { position: relative; background: #f8faf9; padding: 25px; border-radius: 12px; flex: 1 1 calc(50% - 10px); margin-bottom: 10px; }
                .info-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #8B5CF6; margin-bottom: 10px; font-weight: 600; }
                .info-content { font-size: 15px; color: #4a5568; }
                .footer { background: #f8faf9; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
                .footer-text { color: #718096; font-size: 14px; margin: 5px 0; }
                .divider { width: 60px; height: 2px; background: rgba(8,104,69,0.2); margin: 15px auto; }
                @media only screen and (max-width: 600px) {
                    .email-container { margin: 0; }
                    .header, .content { padding: 20px; }
                    .logo-wrapper { padding: 15px 30px; }
                    .notification-card { padding: 20px; }
                    .info-box { flex: 1 1 100%; }
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
                        <div class=\"tag\">Assignment Due</div>
                        <div class=\"message-content\">
                            <p>Dear {$student_name},</p>
                            <br>
                            <p>This is a friendly reminder that your assignment for <strong>{$subject_name}</strong> titled <strong>{$assignment_title}</strong> is due soon.</p>
                            <div class=\"assignment-details\">
                                <h3>Assignment Details</h3>
                                <p><strong>Assignment Title:</strong> {$assignment_title}</p>
                                <p><strong>Subject:</strong> {$subject_name}</p>
                                <p><strong>Submission Deadline:</strong> {$due_date}</p>
                            </div>
                            <p>Please make sure to complete and submit your assignment on time through the LMS.</p>
                        </div>
                    </div>
                    <div class=\"cta-section\">
                        <a href=\"{$login_url}\" class=\"cta-button\">Submit Assignment</a>
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
                    <p class=\"footer-text\">This email was sent to {$student_name}</p>
                </div>
            </div>
        </body>
        </html>";
    }
    
    public function assignment_new_available_reminder_cron()
    {
        $today = new \DateTime();
        $target_date = (clone $today)->modify('-20 days')->format('Y-m-d');

        // Get cohorts created exactly 20 days ago
        $cohorts = $this->cohorts_model->get(['created_at >=' => $target_date . ' 00:00:00', 'created_at <=' => $target_date . ' 23:59:59'])->getResultArray();
        if (!$cohorts) return;

        foreach ($cohorts as $cohort) {
            $cohort_id = $cohort['id'];
            $subject_name = $cohort['title'] ?? '';
            $student_ids = array_column($this->cohort_students_model->get(['cohort_id' => $cohort_id])->getResultArray(), 'user_id');
            if (!$student_ids) continue;
            $students = $this->users_model->get(['id' => $student_ids])->getResultArray();
            $assignments = $this->assignment_model->get(['cohort_id' => $cohort_id])->getResultArray();
            if (!$assignments) continue;

            foreach ($assignments as $assignment) {
                $assignment_id = $assignment['id'];
                $assignment_title = $assignment['title'];
                $due_date = $assignment['due_date'];
                $submission_format = $assignment['instructions'] ?? 'PDF upload';
                $login_url = base_url('login/index');

                foreach ($students as $student) {
                    // Check if reminder already sent
                    $where = [
                        'assignment_id' => $assignment_id,
                        'user_id' => $student['id'],
                        'reminder_type' => 'new'
                    ];
                    if ($this->assignment_reminders_model->get($where)->getNumRows() > 0) continue;

                    $subject = "New Assignment Available – {$subject_name}";
                    $body = $this->render_assignment_new_available_reminder_student_styled($student['name'], $subject_name, $assignment_title, $due_date, $submission_format, $login_url);
                    send_email_message($student['user_email'], $student['name'], $subject, $body, 'TTII Education');

                    // Log reminder as sent
                    $this->assignment_reminders_model->add([
                        'assignment_id' => $assignment_id,
                        'user_id' => $student['id'],
                        'reminder_type' => 'new',
                        'sent_at' => date('Y-m-d H:i:s'),
                        'created_at' => date('Y-m-d H:i:s'),
                    ]);
                }
            }
        }
        log_message('error', 'Assignment New Available Reminders sent.');
    }

    private function render_assignment_new_available_reminder_student_styled($student_name, $subject_name, $assignment_title, $due_date, $submission_format, $login_url)
    {
        return "<!DOCTYPE html>
            <html lang=\"en\">
            <head>
                <meta charset=\"UTF-8\">
                <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                <title>New Assignment Available</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2d3748; background-color: #f7fafc; }
                    .email-container { max-width: 650px; margin: 20px auto; background: #ffffff; overflow: hidden; }
                    .top-accent { height: 5px; background: linear-gradient(to right, #8B5CF6, #0a875c, #8B5CF6); }
                    .header { position: relative; padding: 40px; text-align: center; background: #8B5CF6; }
                    .header::after { content: ''; position: absolute; bottom: -20px; left: 0; right: 0; height: 40px; background: #8B5CF6; transform: skewY(-2deg); }
                    .logo-wrapper { position: relative; z-index: 1; display: inline-block; padding: 20px 40px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                    .logo { max-width: 150px; height: auto; }
                    .content { position: relative; padding: 60px 40px 40px; background: white; }
                    .notification-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; margin-bottom: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
                    .tag { display: inline-block; padding: 6px 12px; background: rgba(8,104,69,0.1); color: #8B5CF6; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
                    .message-content { color: #4a5568; font-size: 16px; line-height: 1.8; }
                    .assignment-details { background: #f8faf9; padding: 25px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #8B5CF6; }
                    .cta-section { text-align: center; margin: 30px 0; }
                    .cta-button { display: inline-block; padding: 16px 40px; background: #8B5CF6; color: white !important; text-decoration: none !important; border-radius: 8px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 6px rgba(8,104,69,0.2); }
                    .cta-button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(8,104,69,0.3); }
                    .info-grid { margin-top: 40px; display: flex; flex-wrap: wrap; gap: 20px; }
                    .info-box { position: relative; background: #f8faf9; padding: 25px; border-radius: 12px; flex: 1 1 calc(50% - 10px); margin-bottom: 10px; }
                    .info-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #8B5CF6; margin-bottom: 10px; font-weight: 600; }
                    .info-content { font-size: 15px; color: #4a5568; }
                    .footer { background: #f8faf9; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
                    .footer-text { color: #718096; font-size: 14px; margin: 5px 0; }
                    .divider { width: 60px; height: 2px; background: rgba(8,104,69,0.2); margin: 15px auto; }
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
                            <div class=\"tag\">New Assignment</div>
                            <div class=\"message-content\">
                                <p>Dear {$student_name},</p>
                                <br>
                                <p>A new assignment for <strong>{$subject_name}</strong> is now available on the Teachers' Training Institute of India Learning Management System (LMS).</p>
                                <div class=\"assignment-details\">
                                    <h3>Assignment Details</h3>
                                    <p><strong>Assignment Title:</strong> {$assignment_title}</p>
                                    <p><strong>Subject:</strong> {$subject_name}</p>
                                    <p><strong>Deadline:</strong> {$due_date}</p>
                                    <p><strong>Submission Format:</strong> {$submission_format}</p>
                                </div>
                                <p>Please ensure you complete and submit your assignment before the deadline.</p>
                            </div>
                        </div>
                        <div class=\"cta-section\">
                            <a href=\"{$login_url}\" class=\"cta-button\">View Assignment</a>
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
                        <p class=\"footer-text\">This email was sent to {$student_name}</p>
                    </div>
                </div>
            </body>
            </html>";
    }
    
    public function cohort_completion_reminder_cron()
    {
        $today = date('Y-m-d');
        // Get all cohorts ending today
        $cohorts = $this->cohorts_model->get(['end_date' => $today])->getResultArray();
        if (!$cohorts) return;

        foreach ($cohorts as $cohort) {
            $cohort_id = $cohort['id'];
            $subject_name = $cohort['title'] ?? '';
            $student_ids = array_column($this->cohort_students_model->get(['cohort_id' => $cohort_id])->getResultArray(), 'user_id');
            if (!$student_ids) continue;
            $students = $this->users_model->get(['id' => $student_ids])->getResultArray();

            // Placeholders for demo; replace with actual calculations as needed
            $overall_grade = 'A+';
            $assignments_completed = 5;
            $activities_participated = 3;
            $next_course_name = 'Advanced Teaching Skills';
            $next_course_date = date('Y-m-d', strtotime('+7 days'));
            $resources_link = base_url('resources');

            foreach ($students as $student) {
                // Check if reminder already sent
                $where = [
                    'cohort_id' => $cohort_id,
                    'user_id' => $student['id'],
                    'reminder_type' => 'cohort_complete'
                ];
                if ($this->assignment_reminders_model->get($where)->getNumRows() > 0) continue;

                $subject = "Congratulations on Completing Your Cohort – {$subject_name}";
                $body = $this->render_cohort_completion_reminder_student_styled(
                    $student['name'],
                    $subject_name,
                    $overall_grade,
                    $assignments_completed,
                    $activities_participated,
                    $next_course_name,
                    $next_course_date,
                    $resources_link
                );
                send_email_message($student['user_email'], $student['name'], $subject, $body, 'TTII Education');

                // Log reminder as sent
                $this->assignment_reminders_model->add([
                    'cohort_id' => $cohort_id,
                    'assignment_id' => 0,
                    'user_id' => $student['id'],
                    'reminder_type' => 'cohort_complete',
                    'sent_at' => date('Y-m-d H:i:s'),
                    'created_at' => date('Y-m-d H:i:s'),
                ]);
            }
        }
        log_message('error', 'Cohort Completion Reminders sent.');
    }

    private function render_cohort_completion_reminder_student_styled(
        $student_name, $subject_name, $overall_grade, $assignments_completed, $activities_participated, $next_course_name, $next_course_date, $resources_link
    ) {
        return "<!DOCTYPE html>
        <html lang=\"en\">
        <head>
            <meta charset=\"UTF-8\">
            <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
            <title>Cohort Completion Congratulations</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2d3748; background-color: #f7fafc; }
                .email-container { max-width: 650px; margin: 20px auto; background: #ffffff; overflow: hidden; }
                .top-accent { height: 5px; background: linear-gradient(to right, #8B5CF6, #0a875c, #8B5CF6); }
                .content { position: relative; padding: 60px 40px 40px; background: white; }
                .notification-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; margin-bottom: 30px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
                .message-content { color: #4a5568; font-size: 16px; line-height: 1.8; }
                .summary-details { background: #f8faf9; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #8B5CF6; }
                .footer { background: #f8faf9; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
                .footer-text { color: #718096; font-size: 14px; margin: 5px 0; }
                .divider { width: 60px; height: 2px; background: rgba(237,119,29,0.3); margin: 15px auto; }
                .login-button { display: inline-block; background: #8B5CF6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; transition: background-color 0.3s; }
                .login-button:hover { background: rgb(217 99 9); }
            </style>
        </head>
        <body>
            <div class=\"email-container\">
                <div class=\"top-accent\"></div>
                <div class=\"content\">
                    <div class=\"notification-card\">
                        <div class=\"message-content\">
                            <p>Dear {$student_name},</p>
                            <br>
                            <p>Congratulations on successfully completing the cohort for <strong>{$subject_name}</strong> at Teachers' Training Institute of India!</p>
                            <div class=\"summary-details\">
                                <h3>Your Performance Summary:</h3>
                                <p><strong>Overall Grade:</strong> {$overall_grade}</p>
                                <p><strong>Assignments Completed:</strong> {$assignments_completed}</p>
                                <p><strong>Activities Participated:</strong> {$activities_participated}</p>
                            </div>
                            <p>As you move forward, here’s what’s next:</p>
                            <ul>
                                <li><strong>{$next_course_name}</strong> starts on <strong>{$next_course_date}</strong></li>
                                <li>Access additional resources here: <a href=\"{$resources_link}\" class=\"login-button\">Resources</a></li>
                                <li>For any questions or guidance, contact us at <a href=\"mailto:support@teachersindia.in\" style=\"color: #8B5CF6;\">support@teachersindia.in</a></li>
                            </ul>
                            <p>We wish you continued success in your learning journey!</p>
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
    }
    
    public function notification_email_cron()
    {
        // Get all notifications where is_email_send = 0
        $notifications = $this->notification_model->get(['is_email_send' => 0])->getResultArray();
        if (!$notifications) return;

        // Get all students
        $students = $this->users_model->get(['role_id' => 2])->getResultArray();
        if (!$students) return;

        foreach ($notifications as $notification) {
            $title = $notification['title'];
            $description = $notification['description'];
            foreach ($students as $student) {
                $subject = "Important Announcement from Teachers' Training Institute of India";
                $body = $this->render_notification_email_student_styled($student['name'], $title, $description);
                send_email_message($student['user_email'], $student['name'], $subject, $body, 'TTII Education');
            }
            // Mark notification as email sent
            $this->notification_model->edit(['is_email_send' => 1], ['id' => $notification['id']]);
        }
        log_message('error', 'Notification Announcement Emails sent.');
    }

    private function render_notification_email_student_styled($student_name, $announcement_title, $announcement_details)
    {
        return "<!DOCTYPE html>
        <html lang=\"en\">
        <head>
            <meta charset=\"UTF-8\">
            <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
            <title>Important Announcement</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2d3748; background-color: #f7fafc; }
                .email-container { max-width: 650px; margin: 20px auto; background: #ffffff; overflow: hidden; }
                .top-accent { height: 5px; background: linear-gradient(to right, #8B5CF6, #0a875c, #8B5CF6); }
                .header { position: relative; padding: 40px; text-align: center; background: #8B5CF6; }
                .header::after { content: ''; position: absolute; bottom: -20px; left: 0; right: 0; height: 40px; background: #8B5CF6; transform: skewY(-2deg); }
                .logo-wrapper { position: relative; z-index: 1; display: inline-block; padding: 20px 40px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                .logo { max-width: 150px; height: auto; }
                .content { position: relative; padding: 60px 40px 40px; background: white; }
                .notification-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; margin-bottom: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
                .tag { display: inline-block; padding: 6px 12px; background: rgba(8,104,69,0.1); color: #8B5CF6; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
                .message-content { color: #4a5568; font-size: 16px; line-height: 1.8; }
                .announcement-details { background: #f8faf9; padding: 25px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #8B5CF6; }
                .info-grid { margin-top: 40px; display: flex; flex-wrap: wrap; gap: 20px; }
                .info-box { position: relative; background: #f8faf9; padding: 25px; border-radius: 12px; flex: 1 1 calc(50% - 10px); margin-bottom: 10px; }
                .info-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #8B5CF6; margin-bottom: 10px; font-weight: 600; }
                .info-content { font-size: 15px; color: #4a5568; }
                .footer { background: #f8faf9; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
                .footer-text { color: #718096; font-size: 14px; margin: 5px 0; }
                .divider { width: 60px; height: 2px; background: rgba(8,104,69,0.2); margin: 15px auto; }
                @media only screen and (max-width: 600px) {
                    .email-container { margin: 0; }
                    .header, .content { padding: 20px; }
                    .logo-wrapper { padding: 15px 30px; }
                    .notification-card { padding: 20px; }
                    .info-box { flex: 1 1 100%; }
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
                        <div class=\"tag\">Important Announcement</div>
                        <div class=\"message-content\">
                            <p>Dear {$student_name},</p>
                            <br>
                            <p>We have an important update for you:</p>
                            <div class=\"announcement-details\">
                                <h3>{$announcement_title}</h3>
                                <p>{$announcement_details}</p>
                            </div>
                            <p>Please stay tuned for more information, and feel free to reach out if you have any questions.</p>
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
                    <p class=\"footer-text\">This email was sent to {$student_name}</p>
                </div>
            </div>
        </body>
        </html>";
    }
    // this one has isssue
    public function ai_inactivity_reminder_cron()
    {
        $users = $this->users_model->get(['role_id' => 2])->getResultArray();
        if (!$users) return;

        $cache = \Config\Services::cache();
        $seven_days_ago = strtotime('-7 days');
        $login_url = base_url('login/index');

        foreach ($users as $student) {
            $user_id = $student['id'];
            $cache_key = 'ai_chat_list_' . $user_id;
            $chat_history = $cache->get($cache_key);
            $last_used = null;
            if (is_array($chat_history) && !empty($chat_history)) {
                // Find the last message timestamp (if you store timestamps)
                // If not, fallback to cache creation time (not ideal, but works for now)
                if (isset($chat_history['last_used'])) {
                    $last_used = $chat_history['last_used'];
                } else {
                    $last_used = $cache->getMetadata($cache_key)['mtime'] ?? null;
                }
            }
            // If never used, or last used > 7 days ago
            if (!$last_used || $last_used < $seven_days_ago) {
                // Check if reminder already sent for this inactivity period
                $where = [
                    'user_id' => $user_id,
                    'reminder_type' => 'ai_inactive',
                    'created_at >=' => date('Y-m-d 00:00:00', $seven_days_ago),
                    'created_at <=' => date('Y-m-d 23:59:59', $seven_days_ago)
                ];
                if ($this->assignment_reminders_model->get($where)->getNumRows() > 0) continue;

                $subject = "We Miss You! Engage with Your AI Mentor for Support";
                $body = $this->render_ai_inactivity_reminder_student_styled($student['name'], $login_url);
                send_email_message($student['user_email'], $student['name'], $subject, $body, 'TTII Education');

                // Log reminder as sent
                $this->assignment_reminders_model->add([
                    'assignment_id' => 0,
                    'user_id' => $user_id,
                    'reminder_type' => 'ai_inactive',
                    'sent_at' => date('Y-m-d H:i:s'),
                    'created_at' => date('Y-m-d H:i:s'),
                ]);
            }
        }
        log_message('error', 'AI Inactivity Reminders sent.');
    }

    private function render_ai_inactivity_reminder_student_styled($student_name, $login_url)
    {
        return "<!DOCTYPE html>
        <html lang=\"en\">
        <head>
            <meta charset=\"UTF-8\">
            <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
            <title>We Miss You! Engage with Your AI Mentor for Support</title>
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
                .divider { width: 60px; height: 2px; background: rgba(237,119,29,0.3); margin: 15px auto; }
            </style>
        </head>
        <body>
            <div class=\"email-container\">
                <div class=\"top-accent\"></div>
                <div class=\"content\">
                    <div class=\"notification-card\">
                        <div class=\"message-content\">
                            <p>Dear {$student_name},</p>
                            <br>
                            <p>We noticed that you haven’t engaged with your AI Mentor on the Teachers' Training Institute of India Learning Management System (LMS) for the past 7 days.</p>
                            <p>Your AI Mentor is here to support your learning journey by answering questions, providing guidance, and helping you stay on track.</p>
                            <p>We encourage you to log in and interact with your AI Mentor to make the most of this valuable resource.</p>
                            <p>Access your AI Mentor here:</p>
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
    }



    // Cron Jobs - 24/7/25 - not added to cron job yet

    public function payment_due_reminder_cron()
    {
        $today = new \DateTimeImmutable();
        $seven_days_before = $today->modify('+7 days')->format('Y-m-d');
        $one_day_after     = $today->modify('-1 day')->format('Y-m-d');
        $ten_days_after    = $today->modify('-10 days')->format('Y-m-d');

        $send_reminder = function($payments, $reminder_type) {
            foreach ($payments as $payment) {
                $payment_id = $payment['id'];
                $user_id = $payment['user_id'];
                $due_date = $payment['due_date'];
                $amount = $payment['amount'];

                $course = $this->course_model->get(['id' => $payment['course_id']])->getRowArray();

                $user = $this->users_model->get(['id' => $user_id, 'role_id' => 2])->getRowArray();

                            
                if (!$user) continue;


                // Skip if already sent
                $where = [
                    'payment_id' => $payment_id,
                    'user_id' => $user_id,
                    'reminder_type' => $reminder_type
                ];
                if ($this->payment_reminders_model->get($where)->getNumRows() > 0) {
                    log_message('error', "Reminder already exists for payment ID: {$payment['id']}");
                    continue;
                }

                log_message('error', "No reminder found, sending now for payment ID: {$payment['id']}");

                // Compose mail
                $subject = match($reminder_type) {
                    '7day' => " Reminder: Upcoming Fee Payment Due in 7 Days – Due on $due_date",
                    '1day_overdue' => "Payment Overdue Notice – Immediate Action Required",
                    '10day_restrict' => " Account Access Restricted Due to Overdue Payment ",
                    default => "Payment Reminder",
                };

                $body = $this->render_payment_reminder_template(
                            $user['name'],
                            $course['title'] ?? 'course',   // You must fetch course info from `course_id`
                            $due_date,
                            $amount,
                            base_url('login/index') // or a specific payment URL if available
                        );

                send_email_message($user['user_email'], $user['name'], $subject, $body, 'TTII Education');

                // Log reminder
                $this->payment_reminders_model->add([
                    'payment_id' => $payment_id,
                    'user_id' => $user_id,
                    'reminder_type' => $reminder_type,
                    'sent_at' => date('Y-m-d H:i:s'),
                    'created_at' => date('Y-m-d H:i:s'),
                ]);
            }
        };

        // Get upcoming payments
        $due_7day = $this->student_fee_model->get(['due_date' => $seven_days_before, 'status' => 'Pending'])->getResultArray();
        $overdue_1day = $this->student_fee_model->get(['due_date' => $one_day_after, 'status' => 'Pending'])->getResultArray();
        $restrict_10day = $this->student_fee_model->get(['due_date' => $ten_days_after, 'status' => 'Pending'])->getResultArray();

        if (empty($due_7day) && empty($overdue_1day) && empty($restrict_10day)) {
            log_message('error', 'No payments found for payment reminders.');
            return;
        }


        $send_reminder($due_7day, '7day');
        $send_reminder($overdue_1day, '1day_overdue');
        $send_reminder($restrict_10day, '10day_restrict');

        log_message('error', 'Payment Reminders sent.');
        }

        private function render_payment_reminder_template($student_name, $course_name, $due_date, $amount, $payment_link = '#')
        {
        $formatted_due_date = date('F j, Y', strtotime($due_date)); // e.g., July 30, 2025

        // Determine reminder type based on the number of days from today
        $today = new \DateTime();
        $due = new \DateTime($due_date);
        $interval = $today->diff($due)->format('%r%a'); // signed days difference

        if ($interval == 7) {
            // 7 days before due date
            $tag_text = "Payment Due Soon";
            $message = "This is a friendly reminder that your fee payment for the course <strong>{$course_name}</strong> is due in 7 days.";
            $button_text = "Make Payment";
        } elseif ($interval == -1) {
            // 1 day after due date
            $tag_text = "Payment Overdue";
            $message = "Our records indicate that your fee payment for the course <strong>{$course_name}</strong> was due on <strong>{$formatted_due_date}</strong> and has not yet been received.";
            $button_text = "Pay Now";
        } elseif ($interval == -10) {
            // 10 days after due date
            $tag_text = "Account Restricted";
            $message = "This is an important notice that your account access has been temporarily restricted due to non-payment of your course fees.";
            $button_text = "Restore Access";
        } else {
            // Default fallback message
            $tag_text = "Payment Reminder";
            $message = "This is a reminder regarding your pending fee payment for the course <strong>{$course_name}</strong>. Your due date is <strong>{$formatted_due_date}</strong>.";
            $button_text = "Make Payment";
        }

        $html = "
            <!DOCTYPE html>
            <html lang='en'>
            <head>
                <meta charset='UTF-8'>
                <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                <title>Payment Reminder</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2d3748; background-color: #f7fafc; }
                    .email-container { max-width: 650px; margin: 20px auto; background: #ffffff; overflow: hidden; }
                    .top-accent { height: 5px; background: linear-gradient(to right, #8B5CF6, #0a875c, #8B5CF6); }
                    .header { position: relative; padding: 40px; text-align: center; background: #8B5CF6; }
                    .header::after { content: ''; position: absolute; bottom: -20px; left: 0; right: 0; height: 40px; background: #8B5CF6; transform: skewY(-2deg); }
                    .logo-wrapper { position: relative; z-index: 1; display: inline-block; padding: 20px 40px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                    .logo { max-width: 150px; height: auto; }
                    .content { position: relative; padding: 60px 40px 40px; background: white; }
                    .notification-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; margin-bottom: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
                    .tag { display: inline-block; padding: 6px 12px; background: rgba(8,104,69,0.1); color: #8B5CF6; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
                    .message-content { color: #4a5568; font-size: 16px; line-height: 1.8; }
                    .payment-details { background: #f8faf9; padding: 25px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #8B5CF6; }
                    .cta-section { text-align: center; margin: 30px 0; }
                    .cta-button { display: inline-block; padding: 16px 40px; background: #8B5CF6; color: white !important; text-decoration: none !important; border-radius: 8px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 6px rgba(8,104,69,0.2); }
                    .cta-button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(8,104,69,0.3); }
                    .info-grid { margin-top: 40px; display: flex; flex-wrap: wrap; gap: 20px; }
                    .info-box { position: relative; background: #f8faf9; padding: 25px; border-radius: 12px; flex: 1 1 calc(50% - 10px); margin-bottom: 10px; }
                    .info-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #8B5CF6; margin-bottom: 10px; font-weight: 600; }
                    .info-content { font-size: 15px; color: #4a5568; }
                    .footer { background: #f8faf9; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
                    .footer-text { color: #718096; font-size: 14px; margin: 5px 0; }
                    .divider { width: 60px; height: 2px; background: rgba(8,104,69,0.2); margin: 15px auto; }
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
                <div class='email-container'>
                    <div class='top-accent'></div>
                    <div class='header'>
                        <div class='logo-wrapper'>
                            <img src='" . base_url(get_file(get_site_logo())) . "' alt='TTII Logo' class='logo'>
                        </div>
                    </div>
                    <div class='content'>
                        <div class='notification-card'>
                            <div class='tag'>{$tag_text}</div>
                            <div class='message-content'>
                                <p>Dear <strong>{$student_name}</strong>,</p>
                                <br>
                                <p>{$message}</p>
                                <div class='payment-details'>
                                    <h3>Payment Details</h3>
                                    <p><strong>Course:</strong> {$course_name}</p>
                                    <p><strong>Amount Due:</strong> ₹{$amount}</p>
                                    <p><strong>Due Date:</strong> {$formatted_due_date}</p>
                                </div>
                                <p>Please ensure your payment is made on time to avoid any disruption to your course access.</p>
                            </div>
                        </div>
                        <div class='cta-section'>
                            <a href='{$payment_link}' class='cta-button'>{$button_text}</a>
                        </div>
                        <div class='info-grid'>
                            <div class='info-box'>
                                <div class='info-label'>Phone</div>
                                <div class='info-content'>(+91) 9747 400 111</div>
                            </div>
                            <div class='info-box'>
                                <div class='info-label'>Email</div>
                                <div class='info-content'>billing@teachersindia.in</div>
                            </div>
                            <div class='info-box' style='flex: 1 1 100%;'>
                                <div class='info-label'>Address</div>
                                <div class='info-content'>Teachers' Training Institute of India<br>2nd floor, Kannattu Building,<br>Opposite Holiday Inn Hotel,<br>Chakkaraparambu, NH 66 Ernakulam,<br>Kerala-682032</div>
                            </div>
                        </div>
                    </div>
                    <div class='footer'>
                        <p class='footer-text'>© 2025 Teachers' Training Institute of India</p>
                        <div class='divider'></div>
                        <p class='footer-text'>This email was sent to {$student_name}</p>
                    </div>
                </div>
            </body>
            </html>
        ";

    return $html;
    }

    public function send_payment_confirmation_email(array $payment)   //$this->send_payment_confirmation_email($payment);
    {
        $user = $this->users_model->get(['id' => $payment['user_id'], 'role_id' => 2])->getRowArray();
        $course = $this->course_model->get(['id' => $payment['course_id']])->getRowArray();

        if (!$user || !$course) return false;

        $message = '

            <p>Dear ' . esc($user['name']) . ',</p>
            <p>We have received your payment for the course <strong>' . esc($course['title']) . '</strong> at Teachers\' Training Institute of India.</p>

            <p><strong>Payment Details:</strong></p>
            <ul>
                <li><strong>Amount Paid:</strong> ₹' . number_format($payment['amount'], 2) . '</li>
                <li><strong>Payment Date:</strong> ' . date('d-m-Y', strtotime($payment['created_at'])) . '</li>
                <li><strong>Transaction ID:</strong> ' . esc($payment['id']) . '</li>
            </ul>

            <p>Please find your payment receipt attached for your records.</p>

            <p>Thank you for your prompt payment. If you have any questions or need assistance, please contact 
            <a href="mailto:billing@teachersindia.in">billing@teachersindia.in</a>.</p>

            <p>Best regards,<br>
            Teachers\' Training Institute of India</p>
        ';

        return send_email_message($user['user_email'], $user['name'] , ' Payment Successful – Thank You for Your Payment ', $message,'TTII Education');
    }

    public function send_payment_confirmation_to_admin(array $payment)
    {
        $user = $this->users_model->get(['id' => $payment['user_id']])->getRowArray();
        $course = $this->course_model->get(['id' => $payment['course_id']])->getRowArray();
        $centre_admin = $this->users_model->get(['id' => $user['centre_admin_id'] ?? null])->getRowArray();

        if (!$user || !$course || !$centre_admin) return false;

        $message = '
            <p>This is to inform you that a payment has been successfully received from <strong>' . esc($user['name']) . '</strong> for the course <strong>' . esc($course['title']) . '</strong> at Teachers\' Training Institute of India.</p>

            <p><strong>Payment Details:</strong></p>
            <ul>
                <li><strong>Learner:</strong> ' . esc($user['name']) . ' (' . esc($user['email']) . ')</li>
                <li><strong>Amount Paid:</strong> ₹' . number_format($payment['amount'], 2) . '</li>
                <li><strong>Payment Date:</strong> ' . date('d-m-Y', strtotime($payment['created_at'])) . '</li>
                <li><strong>Transaction ID:</strong> ' . esc($payment['transaction_id']) . '</li>
            </ul>

            <p>This is for your records. No action is required unless otherwise noted.</p>

            <p>Best regards,<br>
            Teachers\' Training Institute of India</p>
        ';

        return send_email_message($centre_admin['user_email'], $centre_admin['name'] , 'Payment Successful – Confirmation', $message, 'TTII Education');
    }
    
    
    
}
