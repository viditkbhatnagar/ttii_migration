<?php
namespace App\Controllers\Admin;
use App\Models\Live_class_model;
use App\Models\Category_model;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Instructor_enrol_model;
use App\Models\Package_model;
use App\Models\Zoom_history_model;
use App\Models\Cohorts_model;
use App\Models\Cohort_students_model;
use App\Models\Vimeo_videolinks_model;

class Live_class extends AppBaseController
{
    public function __construct()
    {
        parent::__construct();
        $this->live_class_model = new Live_class_model();
        $this->category_model = new Category_model();
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->instructor_enrol_model = new Instructor_enrol_model();
        $this->package_model = new Package_model();
        $this->zoom_history_model = new Zoom_history_model();
        $this->cohorts_model = new Cohorts_model();
        $this->cohort_students_model = new Cohort_students_model();
        $this->vimeo_videolinks_model = new Vimeo_videolinks_model();
    }

    public function index(){
        $this->data['list_items']   = $this->live_class_model->get()->getResultArray();
        $courses                    = $this->course_model->get()->getResultArray();
        $packages                   = $this->package_model->get()->getResultArray();
        $this->data['course']       = array_column($courses,'title','id');
        $this->data['package']      = array_column($packages,'title','id');
        $this->data['page_title']   = 'Live Session';
        $this->data['page_name']    = 'Live_class/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add(){
        $this->data['courses']      = $this->course_model->get()->getResultArray();
        $this->data['categories']   = $this->category_model->get()->getResultArray();
        $this->data['instructor'] =  $this->users_model->get(['role_id'=>3])->getResultArray();
        $this->data['session_id'] = $this->generateSessionId();

        $this->data['students']     = $this->users_model->get(['role_id' => 2])->getResultArray();
        echo view('Admin/Live_class/ajax_add', $this->data);
    }


    public function add(){
        if ($this->request->getMethod() === 'post'){
            // Get common fields
            $zoom_id        = $this->request->getPost('zoom_id');
            $zoom_password  = $this->request->getPost('password');
            $cohort_id      = $this->request->getPost('cohort_id') ?? null;
            
            // Get all entries
            $entries = $this->request->getPost('entries');
            
            if (empty($entries)) {
                return $this->response->setJSON([
                    'success' => false,
                    'message' => 'No live class entries provided!'
                ]);
            }
            
            // Validate cohort instructor
            $cohort_instructor_data = $this->cohorts_model->get_join(
                [
                    ['users', 'cohorts.instructor_id = users.id'],
                ],
                ['cohorts.id' => $cohort_id],
                ['users.name as instructor_name', 'users.user_email as instructor_email','cohorts.instructor_id as instructor_id']
            )->getRowArray();
            
            if(empty($cohort_instructor_data['instructor_id'])) {
                return $this->response->setJSON([
                    'success' => false,
                    'message' => 'Instructor not set, Live class not added!'
                ]);
            }
            
            $instructor = $this->users_model->get(['id' => $cohort_instructor_data['instructor_id']], ['name', 'user_email'])->getRow();
            
            if(empty($instructor)) {
                return $this->response->setJSON([
                    'success' => false,
                    'message' => 'Instructor not set, Live class not added!'
                ]);
            }
            
            // Process each entry
            $successCount = 0;
            $failedCount = 0;
            $insertedIds = [];
            
            foreach ($entries as $entry) {
                $session_id     = $entry['session_id'] ?? '';
                $title          = $entry['title'] ?? '';
                $date           = $entry['date'] ?? '';
                $fromTime       = $entry['fromTime'] ?? '';
                $toTime         = $entry['toTime'] ?? '';
                $isRepetitive   = isset($entry['is_repetitive']) ? 1 : 0;
                $repeatDates    = $entry['repeat_dates'] ?? [];
                
                // Convert array to JSON
                $datesJson = json_encode($repeatDates);
                
                // Prepare data for insertion
                $data = [
                    'zoom_id'       => $zoom_id,
                    'password'      => $zoom_password,
                    'session_id'    => $session_id,
                    'date'          => $date,
                    'title'         => $title,
                    'fromTime'      => $fromTime,
                    'toTime'        => $toTime,
                    'is_repetitive' => $isRepetitive,
                    'cohort_id'     => $cohort_id,
                    'repeat_dates'  => $datesJson,
                    'created_by'    => get_user_id(),
                    'created_at'    => date('Y-m-d H:i:s')
                ];
                
                try {
                    $inserted_id = $this->live_class_model->add($data);
                    if ($inserted_id) {
                        $successCount++;
                        $insertedIds[] = $inserted_id;
                    } else {
                        $failedCount++;
                    }
                } catch (Exception $e) {
                    $failedCount++;
                    log_message('error', 'Failed to add live class: ' . $e->getMessage());
                }
            }
            
            // Return response based on results
            if ($successCount > 0 && $failedCount == 0) {
                // Send emails with all entries at once
                // $emailSentStudent = $this->send_email($entries, $cohort_id, $zoom_id, $zoom_password);
                // $emailSentInstructor = $this->send_email_instructor($entries, $cohort_id, $zoom_id, $zoom_password);
                
                return $this->response->setJSON([
                    'success' => true,
                    'message' => "All {$successCount} live class(es) added successfully!"
                ]);
            } elseif ($successCount > 0 && $failedCount > 0) {
                // Send emails even if some failed
                // $emailSentStudent = $this->send_email($entries, $cohort_id, $zoom_id, $zoom_password);
                // $emailSentInstructor = $this->send_email_instructor($entries, $cohort_id, $zoom_id, $zoom_password);
                
                return $this->response->setJSON([
                    'success' => true,
                    'message' => "{$successCount} live class(es) added successfully, {$failedCount} failed!"
                ]);
            } else {
                return $this->response->setJSON([
                    'success' => false,
                    'message' => 'Failed to add live classes!'
                ]);
            }
        }
    }


    // back up code of 29/11/2025 


    // public function add(){
    //     if ($this->request->getMethod() === 'post'){

    //         // $data = [
    //         //     'title'         => $this->request->getPost('title'),
    //         //     'course_id'     => $this->request->getPost('course_id'),
    //         //     'instructor_id'     => $this->request->getPost('instructor_id'),
    //         //     'zoom_id'       => $this->request->getPost('zoom_id'),
    //         //     'password'      => $this->request->getPost('password'),
    //         //     'fromTime'      => $this->request->getPost('fromTime'),
    //         //     'toTime'        => $this->request->getPost('toTime'),
    //         //     'fromDate'      => $this->request->getPost('fromDate'),
    //         //     'role_id'       => 2,
    //         //     'toDate'        => $this->request->getPost('toDate'),
    //         //     'created_by'    => get_user_id(),
    //         //     'created_at'    => date('Y-m-d H:i:s'),
    //         // ];
            
    //          // Get form input data
    //         $date           = $this->request->getPost('date');
    //         $zoom_id        = $this->request->getPost('zoom_id');
    //         $zoom_password  = $this->request->getPost('password');
    //         $session_id     = $this->request->getPost('session_id');
    //         $title          = $this->request->getPost('title');
    //         $fromTime       = $this->request->getPost('fromTime');
    //         $toTime         = $this->request->getPost('toTime');
    //         $isRepetitive   = $this->request->getPost('is_repetitive') ? 1 : 0;
    //         $repeatDates    = $this->request->getPost('repeat_dates'); // Array of dates
            
    //         $cohort_id       = $this->request->getPost('cohort_id') ?? null;
    
    //         // Convert array to JSON
    //         $datesJson = json_encode($repeatDates);
    
    //         // Insert the session data
    //         $data = [
    //             'zoom_id' => $zoom_id,
    //             'password' => $zoom_password,
    //             'session_id' => $session_id,
    //             'date' => $date,
    //             'title'        => $title,
    //             'fromTime'    => $fromTime,
    //             'toTime'      => $toTime,
    //             'is_repetitive'=> $isRepetitive,
    //             'cohort_id' => $cohort_id,
    //             'repeat_dates'        => $datesJson, // Store as JSON
    //             'created_by'    => get_user_id(),
    //             'created_at'    => date('Y-m-d H:i:s')
    //         ];

            

    //         $cohort_instructor_data = $this->cohorts_model->get_join(
    //             [
    //                 ['users', 'cohorts.instructor_id = users.id'],
    //             ],
    //             ['cohorts.id' => $data['cohort_id']],
    //             ['users.name as instructor_name', 'users.user_email as instructor_email','cohorts.instructor_id as instructor_id']
    //             )->getRowArray();
    //         if(empty($cohort_instructor_data['instructor_id'])) {
    //             return $this->response->setJSON([
    //                 'success' => false,
    //                 'message' => 'Instructor not set, Live class not added!'
    //             ]);
    //         }
    //         $instructor = $this->users_model->get(['id' => $cohort_instructor_data['instructor_id']], ['name', 'user_email'])->getRow();
    //         if(empty($instructor)) {
    //             return $this->response->setJSON([
    //                 'success' => false,
    //                 'message' => 'Instructor not set, Live class not added!'
    //             ]);
    //         }


    //         // $emailSentStudent   = $this->send_email($data);
    //         // $emailSentInstructor = $this->send_email_instructor($data);

    //         // if(!$emailSentStudent){
    //         //     return $this->response->setJSON([
    //         //         'success' => false,
    //         //         'message' => 'Students Email sending failed. Students not set, Live class not added!'
    //         //     ]);
    //         // }
    //         // elseif(!$emailSentInstructor){
    //         //     return $this->response->setJSON([
    //         //         'success' => false,
    //         //         'message' => 'Instructor Email sending failed. Instructor email not set, Live class not added!'
    //         //     ]);
    //         // }
    //         // else{
                
    //         //     $inserted_id = $this->live_class_model->add($data);
    //         //     return $this->response->setJSON([
    //         //         'success' => true,
    //         //         'message' => 'Live Class added successfully!'
    //         //     ]);
    //         // }

    //             $inserted_id = $this->live_class_model->add($data);
    //             return $this->response->setJSON([
    //                 'success' => true,
    //                 'message' => 'Live Class added successfully!'
    //             ]);



    //     }
    // }

      public function addVimeo(){
        if ($this->request->getMethod() === 'post'){
           
            
            $live_class_id = $this->request->getPost('live_class_id');
            $vimeo_url     = $this->request->getPost('vimeo_url');
    
            // Insert the session data
            $data = [
                'video_url' => $vimeo_url
            ];

            $updated = false;
            $html5_url = get_vimeo_file_url($data['video_url']);
            if($html5_url['status'] != 'success')
            {
                return $this->response->setJSON([
                    'success' => false,
                    'message' => 'Vimeo URL not valid'
                ]);

            }
            
                                
                $files      =   $html5_url['files'];
                $downloads  =   $html5_url['downloads'];
                
                $files = array_reverse($files);
                $downloads = array_reverse($downloads);
                
               
                if(!empty($files))
                {
                        // Map downloads by rendition for quick lookup
                    $downloadMap = [];
                    foreach ($downloads as $download) {
                        $downloadMap[$download['rendition']] = $download['link'];
                    }
                    $downloadMap['adaptive'] = '';
                    
                
                    // Add download link to files
                    foreach ($files as &$file) 
                    {
                        $file['download_link'] = $downloadMap[$file['rendition']] ?? null;
                        
                            if ($file['rendition'] === 'adaptive') 
                            {
                            $file['width'] = '1920'; // Default width for adaptive
                            $file['height'] = '1080'; // Default height for adaptive
                            
                                $file = array_merge(
                                    array_slice($file, 0, array_search('type', array_keys($file)) + 1, true),
                                    ['width' => $file['width'], 'height' => $file['height']],
                                    array_slice($file, array_search('type', array_keys($file)) + 1, null, true)
                                );
                        }
                        
                        
                    }
                    
                    usort($files, function ($a, $b) {
                            return strcmp($a['rendition'], $b['rendition']);
                        });
                        
                            // Sort files by rendition, placing "adaptive" first
                    usort($files, function ($a, $b) {
                        if ($a['rendition'] === 'adaptive') return -1;
                        if ($b['rendition'] === 'adaptive') return 1;
                        return strcmp($a['rendition'], $b['rendition']);
                    });
                    
                    
                    foreach ($files as $val) {
                
                            // Prepare data for insertion
                            $vimeo_data = [
                                'lesson_file_id' => null,
                                'live_class_id' => $live_class_id,
                                'quality' => isset($val['quality']) ? $val['quality'] : null,
                                'rendition' => isset($val['rendition']) ? $val['rendition'] : null,
                                'height' => isset($val['height']) ? $val['height'] : null, // Check for key existence
                                'width' => isset($val['width']) ? $val['width'] : null,   // Check for key existence
                                'type' => isset($val['type']) ? $val['type'] : null,
                                'link' => isset($val['link']) ? $val['link'] : null,
                                'fps' => isset($val['fps']) ? $val['fps'] : null,
                                'size' => isset($val['size']) ? $val['size'] : null,
                                'public_name' => isset($val['public_name']) ? $val['public_name'] : null,
                                'size_short' => isset($val['size_short']) ? $val['size_short'] : null,
                                'download_link' => isset($val['download_link']) ? $val['download_link'] : null,
                                'created_by' => get_user_id(),
                                'created_at' => date('Y-m-d H:i:s')
                            ];
                    
                            // Insert into database
                            $this->vimeo_videolinks_model->add($vimeo_data);

                    }
                      $this->live_class_model->edit($data,['id' => $live_class_id]);
                      $updated = true;
                }
            
           

            if ($updated){
                $this->send_recording_added_email($live_class_id);
                // // session()->setFlashdata('message_success', "Zoom Added Successfully!");
                return $this->response->setJSON([
                    'success' => true,
                    'message' => 'Vimeo Link added successfully!'
                ]);
            }else{
                // session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                return $this->response->setJSON([
                    'success' => false,
                    'message' => 'Something went wrong! Try Again!'
                ]);
            }
        }
    }

        // public function test_recording(){
        //     $live_class_id = 212;
        //     $this->send_recording_added_email($live_class_id);
        // }

        private function send_recording_added_email(int $live_class_id)
        {
            //  Get live class details
            $liveClass = $this->live_class_model->get(['id' => $live_class_id])->getRowArray();

            if (empty($liveClass)) {
                log_message('error', 'Recording email failed: Live class not found - ID ' . $live_class_id);
                return false;
            }

            $cohort_id = $liveClass['cohort_id'] ?? null;
            $classDate = !empty($liveClass['date'])
                ? date('d M Y', strtotime($liveClass['date']))
                : '—';


            $className = !empty($liveClass['title']) ? $liveClass['title'] : '—';

            if (empty($cohort_id)) {
                log_message('error', 'Recording email failed: Cohort missing - LiveClass ID ' . $live_class_id);
                return false;
            }

            //  Get students of this cohort
            $students = $this->cohort_students_model->get_join([['users', 'cohort_students.user_id = users.id']], ['cohort_students.cohort_id' => $cohort_id], ['users.name', 'users.user_email'])->getResultArray();

            if (empty($students)) {
                log_message('error', 'Recording email skipped: No students found for cohort ' . $cohort_id);
                return true;
            }

            //  Email subject
            $subject = 'Class Recording Available';

            foreach ($students as $student) {

                $toEmail = $student['user_email'];
                $toName  = $student['name'];

                // Email body (same style, no link)
                $bodyContent = "<!DOCTYPE html>
                <html lang=\"en\">
                <head>
                    <meta charset=\"UTF-8\">
                    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                    <title>Class Recording Available</title>
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
                            padding: 15px;
                            border-left: 4px solid #8B5CF6;
                            border-radius: 10px;
                            margin: 20px 0;
                        }
                        .footer {
                            background: #f8faf9;
                            text-align: center;
                            padding: 25px;
                            font-size: 14px;
                            color: #718096;
                        }
                    </style>
                </head>
                <body>
                    <div class=\"email-container\">
                        <div class=\"top-accent\"></div>
                        <div class=\"content\">
                            <div class=\"card\">
                                <div class=\"message\">
                                    <p>Dear {$toName},</p>

                                    <p>We’re happy to inform you that the <strong>recording for your live class</strong> is now available on the LMS.</p>

                                    <div class=\"highlight\">
                                        <p><strong>Live Class : {$className} <br> Date:</strong> {$classDate}</p>
                                    </div>

                                    <p>You can log in to the LMS to view the recording at your convenience.</p>

                                    <p>If you have any questions, feel free to contact us at
                                        <a href=\"mailto:support@teachersindia.in\" style=\"color:#8B5CF6;\">
                                            support@teachersindia.in
                                        </a>.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class=\"footer\">
                            <p><strong>Teachers' Training Institute of India</strong></p>
                            <p>© " . date('Y') . " Teachers' Training Institute of India</p>
                        </div>
                    </div>
                </body>
                </html>";

                // Send email
                send_email_message(
                    $toEmail,
                    $toName,
                    $subject,
                    $bodyContent,
                    'TTII Education'
                );
            }

            return true;
        }



    

    // private function send_email($data)
    // {
    //     $cohort_data = $this->cohorts_model->get_join(
    //         [
    //             ['subject', 'cohorts.subject_id = subject.id'],
    //             ['course', 'cohorts.course_id = course.id'],
    //             ['users', 'cohorts.instructor_id = users.id'],
    //         ],
    //         ['cohorts.id' => $data['cohort_id']],
    //         ['cohorts.*', 'subject.title as subject_name', 'course.title as course_name', 'users.name as instructor_name', 'users.user_email as instructor_email']
    //     )->getRowArray();

    //     $students_data = $this->cohort_students_model->get(['cohort_id' => $data['cohort_id']], ['user_id'])->getResultArray();
    //     $users_id = array_column($students_data, 'user_id');

    //     $subject = 'Live Class Scheduled - ' . $cohort_data['subject_name'];

    //     $repeatDates = json_decode($data['repeat_dates'], true);
    //     $data['fromTime'] = date('h:i A', strtotime($data['fromTime']));
    //     $data['toTime'] = date('h:i A', strtotime($data['toTime']));
    //     $tableRows = '';
        
    //     if (!empty($repeatDates) && $data['is_repetitive'] == 1) {
    //         foreach ($repeatDates as $index => $date) {
    //             $slNo = $index + 1;
    //             $tableRows .= "
    //                 <tr>
    //                     <td style=\"padding: 10px 8px; border: 1px solid #ddd; text-align: center; background-color: white; font-size: 14px;\">{$slNo}</td>
    //                     <td style=\"padding: 10px 8px; border: 1px solid #ddd; text-align: center; background-color: white; font-size: 14px;\">{$data['title']}</td>
    //                     <td style=\"padding: 10px 8px; border: 1px solid #ddd; text-align: center; background-color: white; font-size: 14px;\">{$date}</td>
    //                     <td style=\"padding: 10px 8px; border: 1px solid #ddd; text-align: center; background-color: white; font-size: 14px;\">{$data['fromTime']} - {$data['toTime']}</td>
    //                 </tr>";
    //         }
    //     } else {
    //         // Single session
    //         $tableRows = "
    //             <tr>
    //                 <td style=\"padding: 10px 8px; border: 1px solid #ddd; text-align: center; background-color: white; font-size: 14px;\">1</td>
    //                 <td style=\"padding: 10px 8px; border: 1px solid #ddd; text-align: center; background-color: white; font-size: 14px;\">{$data['title']}</td>
    //                 <td style=\"padding: 10px 8px; border: 1px solid #ddd; text-align: center; background-color: white; font-size: 14px;\">{$data['date']}</td>
    //                 <td style=\"padding: 10px 8px; border: 1px solid #ddd; text-align: center; background-color: white; font-size: 14px;\">{$data['fromTime']} - {$data['toTime']}</td>
    //             </tr>";
    //     }
        
    //     if(empty($users_id)){
    //         return false; // No students to send email to
    //     }
    //     $students = $this->users_model->get(['id' => $users_id])->getResultArray();
    //     $token = array_column($students, 'notification_token');
            
            
    //             $token = array_filter($token, function ($value) {
    //                 return !is_null($value) && $value !== '';
    //             });
    //             $token = array_chunk($token, 800);
    
    //             foreach ($token as $tk){
    //                 sendNotification("Live Class Scheduled ",`live class has been scheduled for the subject {$cohort_data['subject_name']}`, $tk);
    //             }

    //     // Send email to each student
    //     foreach ($users_id as $student_id) {
    //         $user = $this->users_model->get(['id' => $student_id], ['name', 'user_email', 'phone'])->getRow();
    //         if ($user && $user->user_email) {
    //             $toEmail = $user->user_email;
    //             $toName = $user->name;

    //             $bodyContent = "<!DOCTYPE html>
    //                 <html lang=\"en\">
    //                 <head>
    //                     <meta charset=\"UTF-8\">
    //                     <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    //                     <title>Live Class Scheduled</title>
    //                     <style>
    //                         * {
    //                             margin: 0;
    //                             padding: 0;
    //                             box-sizing: border-box;
    //                         }
    //                         body {
    //                             font-family: 'Segoe UI', Arial, sans-serif;
    //                             line-height: 1.6;
    //                             color: #2d3748;
    //                             background-color: #f7fafc;
    //                         }
    //                         .email-container {
    //                             max-width: 650px;
    //                             margin: 20px auto;
    //                             background: #ffffff;
    //                             overflow: hidden;
    //                         }
    //                         .top-accent {
    //                             height: 5px;
    //                             background: linear-gradient(to right, #8B5CF6, #F59E0B, #8B5CF6);
    //                         }
    //                         .header {
    //                             position: relative;
    //                             padding: 40px;
    //                             text-align: center;
    //                             background: #8B5CF6;
    //                         }
    //                         .header::after {
    //                             content: '';
    //                             position: absolute;
    //                             bottom: -20px;
    //                             left: 0;
    //                             right: 0;
    //                             height: 40px;
    //                             background: #8B5CF6;
    //                             transform: skewY(-2deg);
    //                         }
    //                         .logo-wrapper {
    //                             position: relative;
    //                             z-index: 1;
    //                             display: inline-block;
    //                             padding: 20px 40px;
    //                             border-radius: 0 0 20px 20px;
    //                             box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    //                         }
    //                         .logo {
    //                             max-width: 150px;
    //                             height: auto;
    //                             font-size: 24px;
    //                             font-weight: bold;
    //                             color: #8B5CF6;
    //                         }
    //                         .content {
    //                             position: relative;
    //                             padding: 60px 40px 40px;
    //                             background: white;
    //                         }
    //                         .notification-card {
    //                             background: white;
    //                             border: 1px solid #e2e8f0;
    //                             border-radius: 16px;
    //                             padding: 30px;
    //                             margin-bottom: 30px;
    //                             box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    //                         }
    //                         .message-content {
    //                             color: #4a5568;
    //                             font-size: 16px;
    //                             line-height: 1.8;
    //                         }
    //                         .class-details-section {
    //                             background: #f8faf9;
    //                             padding: 25px;
    //                             border-radius: 12px;
    //                             margin: 25px 0;
    //                             border-left: 4px solid #8B5CF6;
    //                             text-align: center;
    //                         }
    //                         .class-details-title {
    //                             font-size: 20px;
    //                             font-weight: 600;
    //                             color: #2d3748;
    //                             margin-bottom: 20px;
    //                             text-align: center;
    //                         }
    //                         .table-wrapper {
    //                             width: 100%;
    //                             text-align: center;
    //                             margin: 20px 0;
    //                         }
    //                         .class-table {
    //                             width: 90%;
    //                             max-width: 500px;
    //                             margin: 0 auto;
    //                             border-collapse: collapse;
    //                             border: 2px solid #8B5CF6;
    //                             background: white;
    //                             font-family: Arial, sans-serif;
    //                         }
    //                         .class-table th {
    //                             background-color: #8B5CF6 !important;
    //                             color: white !important;
    //                             padding: 12px 8px;
    //                             font-weight: bold;
    //                             text-align: center;
    //                             border: 1px solid #ddd;
    //                             font-size: 14px;
    //                         }
    //                         .class-table td {
    //                             padding: 10px 8px;
    //                             border: 1px solid #ddd;
    //                             text-align: center;
    //                             background-color: white;
    //                             font-size: 14px;
    //                         }
    //                         .class-table tr:nth-child(even) td {
    //                             background-color: #f9f9f9;
    //                         }
    //                         .join-button {
    //                             display: inline-block;
    //                             background: #8B5CF6;
    //                             color: white;
    //                             padding: 15px 40px;
    //                             text-decoration: none;
    //                             border-radius: 8px;
    //                             font-weight: 600;
    //                             margin: 25px 0;
    //                             transition: background-color 0.3s;
    //                             font-size: 16px;
    //                         }
    //                         .join-button:hover {
    //                             background: rgb(217 99 9);
    //                         }
    //                         .footer {
    //                             background: #f8faf9;
    //                             padding: 30px;
    //                             text-align: center;
    //                             border-top: 1px solid #e2e8f0;
    //                         }
    //                         .footer-text {
    //                             color: #718096;
    //                             font-size: 14px;
    //                             margin: 5px 0;
    //                         }
    //                         .divider {
    //                             width: 60px;
    //                             height: 2px;
    //                             background: rgba(237,119,29,0.3);
    //                             margin: 15px auto;
    //                         }
    //                         @media only screen and (max-width: 768px) {
    //                             .email-container { margin: 0; max-width: 100%; }
    //                             .header { padding: 30px 20px; }
    //                             .content { padding: 40px 20px 20px; }
    //                             .logo-wrapper { padding: 15px 25px; }
    //                             .logo { max-width: 120px; }
    //                             .notification-card { padding: 20px; margin-bottom: 30px; }
    //                             .info-grid { flex-direction: column; gap: 15px; }
    //                             .info-box { flex: 1 1 100%; margin-bottom: 15px; }
    //                             .cta-button { padding: 14px 30px; font-size: 14px; }
    //                             .class-details-section { padding: 15px; }
    //                             .class-table { font-size: 12px; width: 95%; }
    //                             .class-table th, .class-table td { padding: 6px 4px; font-size: 11px; }
    //                         }
    //                         @media only screen and (max-width: 480px) {
    //                             .email-container { margin: 0; }
    //                             .header { padding: 20px 15px; }
    //                             .content { padding: 30px 15px 15px; }
    //                             .logo-wrapper { padding: 12px 20px; }
    //                             .logo { max-width: 100px; }
    //                             .notification-card { padding: 15px; margin-bottom: 20px; }
    //                             .message-content { font-size: 14px; }
    //                             .cta-button { padding: 12px 25px; font-size: 13px; width: 100%; max-width: 280px; }
    //                             .info-box { padding: 20px; }
    //                             .info-label { font-size: 11px; }
    //                             .info-content { font-size: 14px; }
    //                             .footer { padding: 20px 15px; }
    //                             .footer-text { font-size: 13px; }
    //                         }
    //                     </style>
    //                 </head>
    //                 <body>
    //                     <div class=\"email-container\">
    //                         <div class=\"top-accent\"></div>
    //                         <div class=\"header\">
    //                             <div class=\"logo-wrapper\">
    //                                 <img src=\"" .base_url(). "/uploads/system/202509/1758687072_c30707b038aa244a95c9_sm.jpg" . "\" alt=\"TTII Logo\" class=\"logo\">
    //                             </div>
    //                         </div>
    //                         <div class=\"content\">
    //                             <div class=\"notification-card\">
    //                                 <div class=\"tag\">Live Class Scheduled</div>
    //                                 <div class=\"message-content\">
    //                                     <p>Dear {$toName},</p>
    //                                     <br>
    //                                     <p>We are pleased to inform you that live class has been scheduled for the subject <strong>{$cohort_data['subject_name']}</strong>.</p>

    //                                     <div class=\"class-details-section\">
    //                                         <h3 class=\"class-details-title\">Live Class Details</h3>
    //                                         <div class=\"table-wrapper\">
    //                                             <table class=\"class-table\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">
    //                                                 <tr>
    //                                                     <th style=\"background-color: #8B5CF6; color: white; padding: 12px 8px; font-weight: bold; text-align: center; border: 1px solid #ddd; font-size: 14px;\">Sl. No.</th>
    //                                                     <th style=\"background-color: #8B5CF6; color: white; padding: 12px 8px; font-weight: bold; text-align: center; border: 1px solid #ddd; font-size: 14px;\">Topic</th>
    //                                                     <th style=\"background-color: #8B5CF6; color: white; padding: 12px 8px; font-weight: bold; text-align: center; border: 1px solid #ddd; font-size: 14px;\">Date</th>
    //                                                     <th style=\"background-color: #8B5CF6; color: white; padding: 12px 8px; font-weight: bold; text-align: center; border: 1px solid #ddd; font-size: 14px;\">Time</th>
    //                                                 </tr>
    //                                                 {$tableRows}
    //                                             </table>
    //                                         </div>
    //                                     </div>
                                        
    //                                     <div style=\"text-align: center;\">
    //                                         <a href=\"#\" class=\"join-button\">[Join Now]</a>
    //                                     </div>
    //                                     <br>
    //                                     <p>Please ensure to join the session on time to make the most of this interactive learning opportunity.</p>
    //                                     <br>
    //                                     <p>If you have any questions or need assistance, feel free to contact us at <a href=\"mailto:support@teachersindia.in\" style=\"color: #8B5CF6;\">support@teachersindia.in</a>.</p>
    //                                     <br>
    //                                     <p>Best regards,<br><strong>Teachers' Training Institute of India</strong></p>
    //                                 </div>
    //                             </div>
                                
    //                             <div class=\"info-grid\">
    //                                 <div class=\"info-box\">
    //                                     <div class=\"info-label\">Phone</div>
    //                                     <div class=\"info-content\">(+91) 9747 400 111</div>
    //                                 </div>
    //                                 <div class=\"info-box\">
    //                                     <div class=\"info-label\">Email</div>
    //                                     <div class=\"info-content\">support@teachersindia.in</div>
    //                                 </div>
    //                                 <div class=\"info-box\" style=\"flex: 1 1 100%;\">
    //                                     <div class=\"info-label\">Address</div>
    //                                     <div class=\"info-content\">Teachers' Training Institute of India<br>Kerala, India</div>
    //                                 </div>
    //                             </div>
    //                         </div>
                            
    //                         <div class=\"footer\">
    //                             <div class=\"divider\"></div>
    //                             <p class=\"footer-text\">© 2025 Teachers' Training Institute of India</p>
    //                             <p class=\"footer-text\">This email was sent to {$toEmail}</p>
    //                         </div>
    //                     </div>
    //                 </body>
    //                 </html>";

    //             // Send email to individual student
    //             send_email_message($toEmail, $toName, $subject, $bodyContent, 'TTII Education');
    //             return true;
    //         }
    //     }
    // }

    private function send_email($entries, $cohort_id, $zoom_id, $zoom_password)
    {
        // Get cohort data
        $cohort_data = $this->cohorts_model->get_join(
            [
                ['subject', 'cohorts.subject_id = subject.id'],
                ['course', 'cohorts.course_id = course.id'],
                ['users', 'cohorts.instructor_id = users.id'],
            ],
            ['cohorts.id' => $cohort_id],
            ['cohorts.*', 'subject.title as subject_name', 'course.title as course_name', 'users.name as instructor_name', 'users.user_email as instructor_email']
        )->getRowArray();

        if (empty($cohort_data)) {
            return false;
        }

        // Get students
        $students_data = $this->cohort_students_model->get(['cohort_id' => $cohort_id], ['user_id'])->getResultArray();
        $users_id = array_column($students_data, 'user_id');

        if (empty($users_id)) {
            return false; // No students to send email to
        }

        // Get student details for notifications
        $students = $this->users_model->get(['id' => $users_id])->getResultArray();
        $token = array_column($students, 'notification_token');
        
        // Send push notifications
        $token = array_filter($token, function ($value) {
            return !is_null($value) && $value !== '';
        });
        $token = array_chunk($token, 800);

        foreach ($token as $tk) {
            sendNotification(
                "Live Class Scheduled",
                "Live class has been scheduled for the subject {$cohort_data['subject_name']}", 
                $tk
            );
        }

        $subject = 'Live Class Scheduled - ' . $cohort_data['subject_name'];

        // Build table rows for all entries
        $tableRows = '';
        $slNo = 1;
        
        foreach ($entries as $entry) {
            $session_id     = $entry['session_id'] ?? '';
            $title          = $entry['title'] ?? '';
            $date           = $entry['date'] ?? '';
            $fromTime       = $entry['fromTime'] ?? '';
            $toTime         = $entry['toTime'] ?? '';
            $isRepetitive   = isset($entry['is_repetitive']) ? 1 : 0;
            $repeatDates    = $entry['repeat_dates'] ?? [];

            // Format times
            $formattedFromTime = date('h:i A', strtotime($fromTime));
            $formattedToTime = date('h:i A', strtotime($toTime));

            // If repetitive, add rows for each repeat date
            if (!empty($repeatDates) && $isRepetitive == 1) {
                foreach ($repeatDates as $repeatDate) {
                    $tableRows .= "
                        <tr>
                            <td style=\"padding: 12px 10px; border: 1px solid #e2e8f0; text-align: center; background-color: white; font-size: 14px; color: #4a5568;\">{$slNo}</td>
                            <td style=\"padding: 12px 10px; border: 1px solid #e2e8f0; text-align: left; background-color: white; font-size: 14px; color: #2d3748; font-weight: 500;\">{$title}</td>
                            <td style=\"padding: 12px 10px; border: 1px solid #e2e8f0; text-align: center; background-color: white; font-size: 14px; color: #4a5568;\">" . date('d M Y', strtotime($repeatDate)) . "</td>
                            <td style=\"padding: 12px 10px; border: 1px solid #e2e8f0; text-align: center; background-color: white; font-size: 14px; color: #4a5568;\">{$formattedFromTime} - {$formattedToTime}</td>
                        </tr>";
                    $slNo++;
                }
            } else {
                // Single session
                $tableRows .= "
                    <tr>
                        <td style=\"padding: 12px 10px; border: 1px solid #e2e8f0; text-align: center; background-color: white; font-size: 14px; color: #4a5568;\">{$slNo}</td>
                        <td style=\"padding: 12px 10px; border: 1px solid #e2e8f0; text-align: left; background-color: white; font-size: 14px; color: #2d3748; font-weight: 500;\">{$title}</td>
                        <td style=\"padding: 12px 10px; border: 1px solid #e2e8f0; text-align: center; background-color: white; font-size: 14px; color: #4a5568;\">" . date('d M Y', strtotime($date)) . "</td>
                        <td style=\"padding: 12px 10px; border: 1px solid #e2e8f0; text-align: center; background-color: white; font-size: 14px; color: #4a5568;\">{$formattedFromTime} - {$formattedToTime}</td>
                    </tr>";
                $slNo++;
            }
        }

        // Send email to each student
        foreach ($users_id as $student_id) {
            $user = $this->users_model->get(['id' => $student_id], ['name', 'user_email', 'phone'])->getRow();
            if ($user && $user->user_email) {
                $toEmail = $user->user_email;
                $toName = $user->name;

                $bodyContent = "<!DOCTYPE html>
                <html lang=\"en\">
                <head>
                    <meta charset=\"UTF-8\">
                    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                    <title>Live Class Scheduled</title>
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
                        .tag { display: inline-block; padding: 6px 12px; background: rgba(139, 92, 246, 0.1); color: #8B5CF6; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
                        .message-content { color: #4a5568; font-size: 16px; line-height: 1.8; }
                        .class-details-section { background: #f8faf9; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #8B5CF6; }
                        .class-details-title { font-size: 18px; font-weight: 600; color: #2d3748; margin-bottom: 20px; }
                        .table-wrapper { overflow-x: auto; margin: 20px 0; }
                        .class-table { width: 100%; border-collapse: collapse; border: 2px solid #8B5CF6; background: white; border-radius: 8px; overflow: hidden; }
                        .class-table th { background-color: #8B5CF6; color: white; padding: 14px 12px; font-weight: 600; text-align: left; border: 1px solid #7C3AED; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
                        .class-table th:first-child { text-align: center; }
                        .class-table th:nth-child(3), .class-table th:nth-child(4) { text-align: center; }
                        .class-table td { padding: 12px 10px; border: 1px solid #e2e8f0; }
                        .class-table tr:nth-child(even) { background-color: #f9fafb; }
                        .class-table tr:hover { background-color: #f3f4f6; }
                        .meeting-info { background: #f0f9ff; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #3b82f6; }
                        .meeting-info-title { font-size: 16px; font-weight: 600; color: #1e40af; margin-bottom: 12px; }
                        .meeting-detail { margin: 8px 0; font-size: 14px; }
                        .meeting-label { font-weight: 600; color: #1e3a8a; display: inline-block; width: 100px; }
                        .meeting-value { color: #475569; }
                        .cta-section { text-align: center; margin: 30px 0; }
                        .cta-button { display: inline-block; padding: 16px 40px; background: #8B5CF6; color: white !important; text-decoration: none !important; border-radius: 8px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3); }
                        .cta-button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(139, 92, 246, 0.4); background: #7C3AED; }
                        .info-grid { margin-top: 40px; display: flex; flex-wrap: wrap; gap: 20px; }
                        .info-box { position: relative; background: #f8faf9; padding: 25px; border-radius: 12px; flex: 1 1 calc(50% - 10px); margin-bottom: 10px; }
                        .info-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #8B5CF6; margin-bottom: 10px; font-weight: 600; }
                        .info-content { font-size: 15px; color: #4a5568; }
                        .footer { background: #f8faf9; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
                        .footer-text { color: #718096; font-size: 14px; margin: 5px 0; }
                        .divider { width: 60px; height: 2px; background: rgba(139, 92, 246, 0.3); margin: 15px auto; }
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
                            .class-table { font-size: 12px; }
                            .class-table th, .class-table td { padding: 8px 6px; font-size: 12px; }
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
                            .class-table { font-size: 11px; }
                            .class-table th, .class-table td { padding: 6px 4px; font-size: 11px; }
                        }
                    </style>
                </head>
                <body>
                    <div class=\"email-container\">
                        <div class=\"top-accent\"></div>
                        <div class=\"header\">
                            <div class=\"logo-wrapper\">
                                <img src=\"" . base_url() . "/uploads/system/202509/1758687072_c30707b038aa244a95c9_sm.jpg\" alt=\"TTII Logo\" class=\"logo\">
                            </div>
                        </div>
                        <div class=\"content\">
                            <div class=\"notification-card\">
                                <div class=\"tag\">Live Class Scheduled</div>
                                <div class=\"message-content\">
                                    <p>Dear {$toName},</p>
                                    <br>
                                    <p>We are pleased to inform you that live class(es) have been scheduled for the subject <strong>{$cohort_data['subject_name']}</strong>.</p>

                                    <div class=\"class-details-section\">
                                        <h3 class=\"class-details-title\">📚 Scheduled Live Classes</h3>
                                        <div class=\"table-wrapper\">
                                            <table class=\"class-table\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">
                                                <thead>
                                                    <tr>
                                                        <th style=\"text-align: center;\">Sl. No.</th>
                                                        <th>Topic</th>
                                                        <th style=\"text-align: center;\">Date</th>
                                                        <th style=\"text-align: center;\">Time</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {$tableRows}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    
                                    <p><strong>Important:</strong> Please ensure to join the session on time to make the most of this interactive learning opportunity.</p>
                                    <br>
                                    <p>If you have any questions or need assistance, feel free to contact us at <a href=\"mailto:support@teachersindia.in\" style=\"color: #8B5CF6; text-decoration: none;\">support@teachersindia.in</a> or call us at <strong>(+91) 9747 400 111</strong>.</p>
                                    <br>
                                    <p>Best regards,<br><strong>Teachers' Training Institute of India</strong></p>
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
                            <p class=\"footer-text\">This email was sent to {$toEmail}</p>
                        </div>
                    </div>
                </body>
                </html>";

                // Send email to individual student
                send_email_message($toEmail, $toName, $subject, $bodyContent, 'TTII Education');
            }
        }
        
        return true;
    }

    // private function send_email_instructor($data)
    // {
    //     $cohort_data = $this->cohorts_model->get_join(
    //         [
    //             ['subject', 'cohorts.subject_id = subject.id'],
    //             ['course', 'cohorts.course_id = course.id'],
    //             ['users', 'cohorts.instructor_id = users.id'],
    //         ],
    //         ['cohorts.id' => $data['cohort_id']],
    //         ['cohorts.*', 'subject.title as subject_name', 'course.title as course_name', 'users.name as instructor_name', 'users.user_email as instructor_email']
    //     )->getRowArray();

    //     $instructor = $this->users_model->get(['id' => $cohort_data['instructor_id']], ['name', 'user_email'])->getRow();
    //     if(empty($instructor)) return false;
    //     $instructor_name = $instructor->name;

    //     $subject = 'Live Class Scheduled for ' . $cohort_data['subject_name'] . ' - TTII';

    //     $repeatDates = json_decode($data['repeat_dates'], true);
    //     $tableRows = '';
        
    //     if (!empty($repeatDates) && $data['is_repetitive'] == 1) {
    //         foreach ($repeatDates as $index => $date) {
    //             $slNo = $index + 1;
    //             $tableRows .= "
    //                 <tr>
    //                     <td style=\"padding: 10px 8px; border: 1px solid #ddd; text-align: center; background-color: white; font-size: 14px; font-weight: bold;\">{$slNo}</td>
    //                     <td style=\"padding: 10px 8px; border: 1px solid #ddd; text-align: center; background-color: white; font-size: 14px; font-weight: bold;\">{$data['title']}</td>
    //                     <td style=\"padding: 10px 8px; border: 1px solid #ddd; text-align: center; background-color: white; font-size: 14px; font-weight: bold;\">{$date}</td>
    //                     <td style=\"padding: 10px 8px; border: 1px solid #ddd; text-align: center; background-color: white; font-size: 14px; font-weight: bold;\">{$data['fromTime']} - {$data['toTime']}</td>
    //                 </tr>";
    //         }
    //     } else {
    //         // Single session
    //         $tableRows = "
    //             <tr>
    //                 <td style=\"padding: 10px 8px; border: 1px solid #ddd; text-align: center; background-color: white; font-size: 14px; font-weight: bold;\">1</td>
    //                 <td style=\"padding: 10px 8px; border: 1px solid #ddd; text-align: center; background-color: white; font-size: 14px; font-weight: bold;\">{$data['title']}</td>
    //                 <td style=\"padding: 10px 8px; border: 1px solid #ddd; text-align: center; background-color: white; font-size: 14px; font-weight: bold;\">{$data['date']}</td>
    //                 <td style=\"padding: 10px 8px; border: 1px solid #ddd; text-align: center; background-color: white; font-size: 14px; font-weight: bold;\">{$data['fromTime']} - {$data['toTime']}</td>
    //             </tr>";
    //     }
        
    //     $toEmail = $instructor->user_email;
    //     $toName = $instructor->name;

    //     $bodyContent = "<!DOCTYPE html>
    //         <html lang=\"en\">
    //         <head>
    //             <meta charset=\"UTF-8\">
    //             <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    //             <title>Live Class Scheduled</title>
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
    //                     background: linear-gradient(to right, #8B5CF6, #F59E0B, #8B5CF6);
    //                 }
    //                 .content {
    //                     position: relative;
    //                     padding: 40px;
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
    //                 .message-content {
    //                     color: #4a5568;
    //                     font-size: 16px;
    //                     line-height: 1.8;
    //                 }
    //                 .class-details-section {
    //                     background: #f8faf9;
    //                     padding: 25px;
    //                     border-radius: 12px;
    //                     margin: 25px 0;
    //                     border-left: 4px solid #8B5CF6;
    //                     text-align: center;
    //                 }
    //                 .class-details-title {
    //                     font-size: 20px;
    //                     font-weight: bold;
    //                     color: #2d3748;
    //                     margin-bottom: 20px;
    //                     text-align: center;
    //                 }
    //                 .table-wrapper {
    //                     width: 100%;
    //                     text-align: center;
    //                     margin: 20px 0;
    //                 }
    //                 .class-table {
    //                     width: 90%;
    //                     max-width: 500px;
    //                     margin: 0 auto;
    //                     border-collapse: collapse;
    //                     border: 2px solid #8B5CF6;
    //                     background: white;
    //                     font-family: Arial, sans-serif;
    //                 }
    //                 .class-table th {
    //                     background-color: #8B5CF6 !important;
    //                     color: white !important;
    //                     padding: 12px 8px;
    //                     font-weight: bold;
    //                     text-align: center;
    //                     border: 1px solid #ddd;
    //                     font-size: 14px;
    //                 }
    //                 .class-table td {
    //                     padding: 10px 8px;
    //                     border: 1px solid #ddd;
    //                     text-align: center;
    //                     background-color: white;
    //                     font-size: 14px;
    //                     font-weight: bold;
    //                 }
    //                 .class-table tr:nth-child(even) td {
    //                     background-color: #f9f9f9;
    //                 }
    //                 .join-button {
    //                     display: inline-block;
    //                     background: #8B5CF6;
    //                     color: white;
    //                     padding: 15px 40px;
    //                     text-decoration: none;
    //                     border-radius: 8px;
    //                     font-weight: 600;
    //                     margin: 25px 0;
    //                     transition: background-color 0.3s;
    //                     font-size: 16px;
    //                 }
    //                 .join-button:hover {
    //                     background: rgb(217 99 9);
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
    //                     .content {
    //                         padding: 20px;
    //                     }
    //                     .notification-card {
    //                         padding: 20px;
    //                     }
    //                     .class-details-section {
    //                         padding: 15px;
    //                     }
    //                     .class-table {
    //                         font-size: 12px;
    //                         width: 95%;
    //                     }
    //                     .class-table th, .class-table td {
    //                         padding: 6px 4px;
    //                         font-size: 11px;
    //                     }
    //                 }
    //                 @media only screen and (max-width: 768px) {
    //                     .email-container { margin: 0; max-width: 100%; }
    //                     .header { padding: 30px 20px; }
    //                     .content { padding: 40px 20px 20px; }
    //                     .logo-wrapper { padding: 15px 25px; }
    //                     .logo { max-width: 120px; }
    //                     .notification-card { padding: 20px; margin-bottom: 30px; }
    //                     .info-grid { flex-direction: column; gap: 15px; }
    //                     .info-box { flex: 1 1 100%; margin-bottom: 15px; }
    //                     .cta-button { padding: 14px 30px; font-size: 14px; }
    //                 }
    //                 @media only screen and (max-width: 480px) {
    //                     .email-container { margin: 0; }
    //                     .header { padding: 20px 15px; }
    //                     .content { padding: 30px 15px 15px; }
    //                     .logo-wrapper { padding: 12px 20px; }
    //                     .logo { max-width: 100px; }
    //                     .notification-card { padding: 15px; margin-bottom: 20px; }
    //                     .message-content { font-size: 14px; }
    //                     .cta-button { padding: 12px 25px; font-size: 13px; width: 100%; max-width: 280px; }
    //                     .info-box { padding: 20px; }
    //                     .info-label { font-size: 11px; }
    //                     .info-content { font-size: 14px; }
    //                     .footer { padding: 20px 15px; }
    //                     .footer-text { font-size: 13px; }
    //                 }
    //             </style>
    //         </head>
    //         <body>
    //             <div class=\"email-container\">
    //                 <div class=\"top-accent\"></div>
                    
    //                 <div class=\"content\">
    //                     <div class=\"notification-card\">
    //                         <div class=\"message-content\">
    //                             <p>Dear <strong>{$toName}</strong>,</p>
    //                             <br>
    //                             <p>This is to inform you that a live class has been scheduled for the subject <strong>{$cohort_data['subject_name']}</strong>.</p>

    //                             <div class=\"class-details-section\">
    //                                 <h3 class=\"class-details-title\">Live Class Details</h3>
    //                                 <div class=\"table-wrapper\">
    //                                     <table class=\"class-table\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">
    //                                         <tr>
    //                                             <th style=\"background-color: #8B5CF6; color: white; padding: 12px 8px; font-weight: bold; text-align: center; border: 1px solid #ddd; font-size: 14px;\">Sl. No.</th>
    //                                             <th style=\"background-color: #8B5CF6; color: white; padding: 12px 8px; font-weight: bold; text-align: center; border: 1px solid #ddd; font-size: 14px;\">Topic</th>
    //                                             <th style=\"background-color: #8B5CF6; color: white; padding: 12px 8px; font-weight: bold; text-align: center; border: 1px solid #ddd; font-size: 14px;\">Date</th>
    //                                             <th style=\"background-color: #8B5CF6; color: white; padding: 12px 8px; font-weight: bold; text-align: center; border: 1px solid #ddd; font-size: 14px;\">Time</th>
    //                                         </tr>
    //                                         {$tableRows}
    //                                     </table>
    //                                 </div>
    //                             </div>
                                
    //                             <div style=\"text-align: center;\">
    //                                 <a href=\"#\" class=\"join-button\">[Join Now]</a>
    //                             </div>
    //                             <br>
    //                             <p>Please ensure you are prepared and join the session on time.</p>
    //                             <br>
    //                             <p>For any assistance, contact <a href=\"mailto:support@teachersindia.in\" style=\"color: #8B5CF6;\">support@teachersindia.in</a>.</p>
    //                             <br>
    //                             <p>Best regards,<br><strong>Teachers' Training Institute of India</strong></p>
    //                         </div>
    //                     </div>
    //                 </div>
                    
    //                 <div class=\"footer\">
    //                     <div class=\"divider\"></div>
    //                     <p class=\"footer-text\">© 2025 Teachers' Training Institute of India</p>
    //                     <p class=\"footer-text\">This email was sent to {$toEmail}</p>
    //                 </div>
    //             </div>
    //         </body>
    //         </html>";

    //     // Send email to instructor
    //     send_email_message($toEmail, $toName, $subject, $bodyContent, 'TTII Education');

    //     return true;
    // }

    private function send_email_instructor($entries, $cohort_id, $zoom_id, $zoom_password)
    {
        // Get cohort data
        $cohort_data = $this->cohorts_model->get_join(
            [
                ['subject', 'cohorts.subject_id = subject.id'],
                ['course', 'cohorts.course_id = course.id'],
                ['users', 'cohorts.instructor_id = users.id'],
            ],
            ['cohorts.id' => $cohort_id],
            ['cohorts.*', 'subject.title as subject_name', 'course.title as course_name', 'users.name as instructor_name', 'users.user_email as instructor_email']
        )->getRowArray();

        if (empty($cohort_data) || empty($cohort_data['instructor_email'])) {
            return false;
        }

        $toEmail = $cohort_data['instructor_email'];
        $toName = $cohort_data['instructor_name'];
        $subject = 'Live Class Scheduled - ' . $cohort_data['subject_name'] . ' (Instructor)';

        // Build table rows for all entries
        $tableRows = '';
        $slNo = 1;
        
        foreach ($entries as $entry) {
            $session_id     = $entry['session_id'] ?? '';
            $title          = $entry['title'] ?? '';
            $date           = $entry['date'] ?? '';
            $fromTime       = $entry['fromTime'] ?? '';
            $toTime         = $entry['toTime'] ?? '';
            $isRepetitive   = isset($entry['is_repetitive']) ? 1 : 0;
            $repeatDates    = $entry['repeat_dates'] ?? [];

            // Format times
            $formattedFromTime = date('h:i A', strtotime($fromTime));
            $formattedToTime = date('h:i A', strtotime($toTime));

            // If repetitive, add rows for each repeat date
            if (!empty($repeatDates) && $isRepetitive == 1) {
                foreach ($repeatDates as $repeatDate) {
                    $tableRows .= "
                        <tr>
                            <td style=\"padding: 12px 10px; border: 1px solid #e2e8f0; text-align: center; background-color: white; font-size: 14px; color: #4a5568;\">{$slNo}</td>
                            <td style=\"padding: 12px 10px; border: 1px solid #e2e8f0; text-align: left; background-color: white; font-size: 14px; color: #2d3748; font-weight: 500;\">{$title}</td>
                            <td style=\"padding: 12px 10px; border: 1px solid #e2e8f0; text-align: center; background-color: white; font-size: 14px; color: #4a5568;\">" . date('d M Y', strtotime($repeatDate)) . "</td>
                            <td style=\"padding: 12px 10px; border: 1px solid #e2e8f0; text-align: center; background-color: white; font-size: 14px; color: #4a5568;\">{$formattedFromTime} - {$formattedToTime}</td>
                        </tr>";
                    $slNo++;
                }
            } else {
                // Single session
                $tableRows .= "
                    <tr>
                        <td style=\"padding: 12px 10px; border: 1px solid #e2e8f0; text-align: center; background-color: white; font-size: 14px; color: #4a5568;\">{$slNo}</td>
                        <td style=\"padding: 12px 10px; border: 1px solid #e2e8f0; text-align: left; background-color: white; font-size: 14px; color: #2d3748; font-weight: 500;\">{$title}</td>
                        <td style=\"padding: 12px 10px; border: 1px solid #e2e8f0; text-align: center; background-color: white; font-size: 14px; color: #4a5568;\">" . date('d M Y', strtotime($date)) . "</td>
                        <td style=\"padding: 12px 10px; border: 1px solid #e2e8f0; text-align: center; background-color: white; font-size: 14px; color: #4a5568;\">{$formattedFromTime} - {$formattedToTime}</td>
                    </tr>";
                $slNo++;
            }
        }

        // Get student count
        $students_data = $this->cohort_students_model->get(['cohort_id' => $cohort_id], ['user_id'])->getResultArray();
        $studentCount = count($students_data);

        $bodyContent = "<!DOCTYPE html>
        <html lang=\"en\">
        <head>
            <meta charset=\"UTF-8\">
            <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
            <title>Live Class Scheduled - Instructor</title>
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
                .tag { display: inline-block; padding: 6px 12px; background: rgba(139, 92, 246, 0.1); color: #8B5CF6; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
                .message-content { color: #4a5568; font-size: 16px; line-height: 1.8; }
                .class-details-section { background: #f8faf9; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #8B5CF6; }
                .class-details-title { font-size: 18px; font-weight: 600; color: #2d3748; margin-bottom: 20px; }
                .table-wrapper { overflow-x: auto; margin: 20px 0; }
                .class-table { width: 100%; border-collapse: collapse; border: 2px solid #8B5CF6; background: white; border-radius: 8px; overflow: hidden; }
                .class-table th { background-color: #8B5CF6; color: white; padding: 14px 12px; font-weight: 600; text-align: left; border: 1px solid #7C3AED; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
                .class-table th:first-child { text-align: center; }
                .class-table th:nth-child(3), .class-table th:nth-child(4) { text-align: center; }
                .class-table td { padding: 12px 10px; border: 1px solid #e2e8f0; }
                .class-table tr:nth-child(even) { background-color: #f9fafb; }
                .class-table tr:hover { background-color: #f3f4f6; }
                .meeting-info { background: #f0f9ff; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #3b82f6; }
                .meeting-info-title { font-size: 16px; font-weight: 600; color: #1e40af; margin-bottom: 12px; }
                .meeting-detail { margin: 8px 0; font-size: 14px; }
                .meeting-label { font-weight: 600; color: #1e3a8a; display: inline-block; width: 100px; }
                .meeting-value { color: #475569; }
                .stats-grid { display: flex; gap: 15px; margin: 20px 0; }
                .stat-box { flex: 1; background: #f0fdf4; padding: 15px; border-radius: 8px; text-align: center; border-left: 3px solid #10b981; }
                .stat-label { font-size: 12px; color: #065f46; text-transform: uppercase; margin-bottom: 5px; }
                .stat-value { font-size: 24px; font-weight: 700; color: #047857; }
                .cta-section { text-align: center; margin: 30px 0; }
                .cta-button { display: inline-block; padding: 16px 40px; background: #8B5CF6; color: white !important; text-decoration: none !important; border-radius: 8px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3); }
                .cta-button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(139, 92, 246, 0.4); background: #7C3AED; }
                .info-grid { margin-top: 40px; display: flex; flex-wrap: wrap; gap: 20px; }
                .info-box { position: relative; background: #f8faf9; padding: 25px; border-radius: 12px; flex: 1 1 calc(50% - 10px); margin-bottom: 10px; }
                .info-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #8B5CF6; margin-bottom: 10px; font-weight: 600; }
                .info-content { font-size: 15px; color: #4a5568; }
                .footer { background: #f8faf9; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
                .footer-text { color: #718096; font-size: 14px; margin: 5px 0; }
                .divider { width: 60px; height: 2px; background: rgba(139, 92, 246, 0.3); margin: 15px auto; }
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
                    .class-table { font-size: 12px; }
                    .class-table th, .class-table td { padding: 8px 6px; font-size: 12px; }
                    .stats-grid { flex-direction: column; }
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
                    .class-table { font-size: 11px; }
                    .class-table th, .class-table td { padding: 6px 4px; font-size: 11px; }
                }
            </style>
        </head>
        <body>
            <div class=\"email-container\">
                <div class=\"top-accent\"></div>
                <div class=\"header\">
                    <div class=\"logo-wrapper\">
                        <img src=\"" . base_url() . "/uploads/system/202509/1758687072_c30707b038aa244a95c9_sm.jpg\" alt=\"TTII Logo\" class=\"logo\">
                    </div>
                </div>
                <div class=\"content\">
                    <div class=\"notification-card\">
                        <div class=\"tag\">Instructor Notification</div>
                        <div class=\"message-content\">
                            <p>Dear {$toName},</p>
                            <br>
                            <p>This is to inform you that live class(es) have been scheduled for <strong>{$cohort_data['subject_name']}</strong> in the <strong>{$cohort_data['course_name']}</strong> course.</p>


                            <div class=\"class-details-section\">
                                <h3 class=\"class-details-title\">📚 Scheduled Live Classes</h3>
                                <div class=\"table-wrapper\">
                                    <table class=\"class-table\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">
                                        <thead>
                                            <tr>
                                                <th style=\"text-align: center;\">Sl. No.</th>
                                                <th>Topic</th>
                                                <th style=\"text-align: center;\">Date</th>
                                                <th style=\"text-align: center;\">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {$tableRows}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            
                            
                            <p><strong>Note:</strong> All enrolled students have been notified about these scheduled classes. Please ensure you're prepared with course materials and ready to conduct engaging sessions.</p>
                            <br>
                            <p>If you need any technical support or have questions, please contact us at <a href=\"mailto:support@teachersindia.in\" style=\"color: #8B5CF6; text-decoration: none;\">support@teachersindia.in</a> or call <strong>(+91) 9747 400 111</strong>.</p>
                            <br>
                            <p>Best regards,<br><strong>Teachers' Training Institute of India</strong></p>
                        </div>
                    </div>
                    
                    <div class=\"cta-section\">
                        <a href=\"" . base_url('login/index') . "\" class=\"cta-button\">Access LMS</a>
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
                    <p class=\"footer-text\">This email was sent to {$toEmail}</p>
                </div>
            </div>
        </body>
        </html>";

        // Send email to instructor
        send_email_message($toEmail, $toName, $subject, $bodyContent, 'TTII Education');
        
        return true;
    }

    public function ajax_edit($id){
        $this->data['edit_data'] = $this->live_class_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Live_class/ajax_edit', $this->data);
    }

    public function edit($id){
        if ($this->request->getMethod() === 'post'){
            $data = [
                'title'         => $this->request->getPost('title'),
                'course_id'     => $this->request->getPost('course_id'),
                'instructor_id'     => $this->request->getPost('instructor_id'),
                'zoom_id'       => $this->request->getPost('zoom_id'),
                'password'      => $this->request->getPost('password'),
                'fromTime'      => $this->request->getPost('fromTime'),
                'toTime'        => $this->request->getPost('toTime'),
                'fromDate'      => $this->request->getPost('fromDate'),
                'role_id'       => 2,
                'toDate'        => $this->request->getPost('toDate'),
                'created_by'    => get_user_id(),
                'updated_by'    => get_user_id(),
                'created_at'    => date('Y-m-d H:i:s'),
                'updated_at'    => date('Y-m-d H:i:s'),
            ];
            $response = $this->live_class_model->edit($data, ['id' => $id]);
            if ($response){
                session()->setFlashdata('message_success', "Designation Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/live_class/index'));
    }

    public function ajax_view($id){
        $this->data['view_data'] = $this->live_class_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Designation/ajax_view', $this->data);
    }

    public function delete(){
        $id = $this->request->getPost('id');
  
        if ($id > 0){
            if ($this->live_class_model->remove(['id' => $id])){
                return $this->response->setJSON([
                    'success' => true,
                    'message' => 'Deleted Successfully!'
                ]);
            }else{
                return $this->response->setJSON([
                    'success' => false,
                    'message' => 'Something went wrong! Try Again'
                ]);
            }
        }else{
            return $this->response->setJSON([
                    'success' => false,
                    'message' => 'Invalid ID!'
            ]);
        }
        // return redirect()->to(base_url('admin/live_class/index'));
    }
    
    
    public function bulk_upload(){
        
        $this->data['list_items'] = $this->live_class_model->get()->getResultArray();
        
        $this->data['page_title'] = 'Question';
        $this->data['page_name'] = 'Question/bulk_upload';
        return view('Admin/index', $this->data);
    }
    public function get_course(){
        $category_id = $this->request->getPost('category_id');
        $courses = $this->course_model->get(['category_id' => $category_id])->getResultArray();
    
        // Initialize the select options HTML with the "Choose Course" option
        $options = '<select><option value="">Choose Course</option>';
    
        // If there are courses available, append them to the options
        if (!empty($courses)) {
            foreach ($courses as $course) {
                // Check if the course ID matches the one sent via AJAX
                $selected = ($course['id'] == $this->request->getPost('selected_course_id')) ? 'selected' : '';
                $options .= '<option value="' . $course['id'] . '" ' . $selected . '>' . $course['title'] . '</option>';
            }
        }
    
        // Close the select tag
        $options .= '</select>';
    
        // Pass the options to the view
        echo $options;
    }
    public function get_course_edit(){
    $category_id = $this->request->getPost('category_id');
    $courses = $this->course_model->get(['category_id' => $category_id])->getResultArray();

    // Pass the options as JSON
    echo json_encode($courses);
}

    public function get_package(){
        $course_id = $this->request->getPost('course_id');
        $packages = $this->package_model->get(['course_id' => $course_id])->getResultArray();
    
        // Initialize the select options HTML with the "Choose Package" option
        $options = '<select><option value="">Choose Package</option>';
    
        // If there are packages available, append them to the options
        if (!empty($packages)) {
            foreach ($packages as $package) {
                // Check if the package ID matches the one sent via AJAX
                $selected = ($package['id'] == $this->request->getPost('selected_package_id')) ? 'selected' : '';
                $options .= '<option value="' . $package['id'] . '" ' . $selected . '>' . $package['title'] . '</option>';
            }
        }
    
        // Close the select tag
        $options .= '</select>';
    
        // Pass the options to the view
        echo $options;
    }
    
    
    public function get_instructor(){
        $course_id = $this->request->getPost('course_id');
       
        $instructors = $this->instructor_enrol_model->get_join(
                            [
                                ['users','users.id = instructor_enrol.instructor_id','left']
                            ], 
                            ['instructor_enrol.course_id'=> $course_id],
                            ['users.id','users.name']
                        )->getResultArray();
        

        // Initialize the select options HTML with the "Choose Package" option
        $options = '<select><option value="">Choose Instructor</option>';
    
        // If there are packages available, append them to the options
        if (!empty($instructors)) {
            foreach ($instructors as $ins) {

                $selected = ($ins['id'] == $this->request->getPost('selected_instructor_id')) ? 'selected' : '';
                $options .= '<option value="' . $ins['id'] . '" ' . $selected . '>' . $ins['name'] . '</option>';
            }
        }
    
        // Close the select tag
        $options .= '</select>';
    
        // Pass the options to the view
        echo $options;
    }
    
    public function get_instructor_without_select(){
        $course_id = $this->request->getPost('course_id');
        $selected_instructor_id = $this->request->getPost('selected_instructor_id');
        
       
        $instructors = $this->instructor_enrol_model->get_join(
                            [
                                ['users','users.id = instructor_enrol.instructor_id','left']
                            ], 
                            ['instructor_enrol.course_id'=> $course_id],
                            ['users.id','users.name']
                        )->getResultArray();
        
        $options = '<option value="">Choose Instructor</option>';
    
        if (!empty($instructors)) {
            foreach ($instructors as $ins) {

                $selected = ($selected_instructor_id == $ins['id']) ? 'selected' : '' ;
                $options .= "<option value='" . $ins['id'] . "' " . $selected . ">" . $ins['name'] . "</option>";
            }
        }
        echo $options;
    }
    
      
    
    public function zoom_history($user_id,$live_id,$date){    
        $stored_created_date = $this->zoom_history_model->get(['user_id' => $user_id])->getRow()->created_at ?? 0;
        $stored_converted_date = date('Y-m-d', strtotime($stored_created_date));
        $current_date = date('Y-m-d', strtotime($date));
        if($current_date==$stored_converted_date){
            $datas['join_time']  = date('H:i:s');
            $datas['updated_at'] = date('Y-m-d H:i:s');
            $this->zoom_history_model->edit($datas,['user_id' => $user_id]);
        }else{    
            $data['user_id']    = $user_id;
            $data['live_id']    = $live_id;
            $data['join_time']  = date('H:i:s');
            $data['join_date']  = date('Y-m-d');
            $data['created_by'] = get_user_id();
            $data['created_at'] = date('Y-m-d H:i:s');
            $this->zoom_history_model->add($data);        
        }
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
    






    // private function send_email($data)
    // {
    //     $cohort_data = $this->cohorts_model->get_join(
    //         [
    //             ['subject', 'cohorts.subject_id = subject.id'],
    //             ['course', 'cohorts.course_id = course.id'],
    //             ['users', 'cohorts.instructor_id = users.id'],
    //         ],
    //         ['cohorts.id' => $data['cohort_id']],
    //         ['cohorts.*', 'subject.title as subject_name', 'course.title as course_name', 'users.name as instructor_name', 'users.user_email as instructor_email']
    //     )->getRowArray();

    //     $students_data = $this->cohort_students_model->get(['cohort_id' => $data['cohort_id']], ['user_id'])->getResultArray();
    //     $users_id = array_column($students_data, 'user_id');

    //     $subject = 'Live Class Scheduled - ' . $cohort_data['subject_name'];

    //     $repeatDates = json_decode($data['repeat_dates'], true);
    //     $tableRows = '';
        
    //     if (!empty($repeatDates) && $data['is_repetitive'] == 1) {
    //         foreach ($repeatDates as $index => $date) {
    //             $slNo = $index + 1;
    //             $tableRows .= "
    //                 <tr>
    //                     <td style=\"padding: 12px; border: 1px solid #e2e8f0; text-align: center; background: #f8faf9;\">{$slNo}</td>
    //                     <td style=\"padding: 12px; border: 1px solid #e2e8f0; text-align: center;\">{$data['title']}</td>
    //                     <td style=\"padding: 12px; border: 1px solid #e2e8f0; text-align: center;\">{$date}</td>
    //                     <td style=\"padding: 12px; border: 1px solid #e2e8f0; text-align: center;\">{$data['fromTime']} - {$data['toTime']}</td>
    //                 </tr>";
    //         }
    //     } else {
    //         // Single session
    //         $tableRows = "
    //             <tr>
    //                 <td style=\"padding: 12px; border: 1px solid #e2e8f0; text-align: center; background: #f8faf9;\">1</td>
    //                 <td style=\"padding: 12px; border: 1px solid #e2e8f0; text-align: center;\">{$data['title']}</td>
    //                 <td style=\"padding: 12px; border: 1px solid #e2e8f0; text-align: center;\">{$data['date']}</td>
    //                 <td style=\"padding: 12px; border: 1px solid #e2e8f0; text-align: center;\">{$data['fromTime']} - {$data['toTime']}</td>
    //             </tr>";
    //     }
    //     if(empty($users_id)){
    //         return; // No students to send email to
    //     }
    //     // echo "<pre>";
    //     // print_r($users_id); exit();
    //     // Send email to each student
    //     foreach ($users_id as $student_id) {
    //         $user = $this->users_model->get(['id' => $student_id], ['name', 'user_email', 'phone'])->getRow();
            
    //         if ($user && $user->user_email) {
    //             $toEmail = $user->user_email;
    //             $toName = $user->name;

    //             $bodyContent = "<!DOCTYPE html>
    //                 <html lang=\"en\">
    //                 <head>
    //                     <meta charset=\"UTF-8\">
    //                     <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    //                     <title>Live Class Scheduled</title>
    //                     <style>
    //                         * {
    //                             margin: 0;
    //                             padding: 0;
    //                             box-sizing: border-box;
    //                         }
    //                         body {
    //                             font-family: 'Segoe UI', Arial, sans-serif;
    //                             line-height: 1.6;
    //                             color: #2d3748;
    //                             background-color: #f7fafc;
    //                         }
    //                         .email-container {
    //                             max-width: 650px;
    //                             margin: 20px auto;
    //                             background: #ffffff;
    //                             overflow: hidden;
    //                         }
    //                         .top-accent {
    //                             height: 5px;
    //                             background: linear-gradient(to right, #8B5CF6, #0a875c, #8B5CF6);
    //                         }
    //                         .header {
    //                             position: relative;
    //                             padding: 10px;
    //                             text-align: center;
    //                             background: white;
    //                         }
    //                         .header::after {
    //                             content: '';
    //                             position: absolute;
    //                             bottom: -20px;
    //                             left: 0;
    //                             right: 0;
    //                             height: 40px;
    //                             background: white;
    //                             transform: skewY(-2deg);
    //                         }
    //                         .logo-wrapper {
    //                             position: relative;
    //                             z-index: 1;
    //                             display: inline-block;
    //                             padding: 20px 40px;
    //                             border-radius: 0 0 20px 20px;
    //                             box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    //                         }
    //                         .logo {
    //                             max-width: 150px;
    //                             height: auto;
    //                             font-size: 24px;
    //                             font-weight: bold;
    //                             color: #8B5CF6;
    //                         }
    //                         .content {
    //                             position: relative;
    //                             padding: 60px 40px 40px;
    //                             background: white;
    //                         }
    //                         .notification-card {
    //                             background: white;
    //                             border: 1px solid #e2e8f0;
    //                             border-radius: 16px;
    //                             padding: 30px;
    //                             margin-bottom: 30px;
    //                             box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    //                         }
    //                         .message-content {
    //                             color: #4a5568;
    //                             font-size: 16px;
    //                             line-height: 1.8;
    //                         }
    //                         .class-details-section {
    //                             background: #f8faf9;
    //                             padding: 25px;
    //                             border-radius: 12px;
    //                             margin: 25px 0;
    //                             border-left: 4px solid #8B5CF6;
    //                         }
    //                         .class-details-title {
    //                             font-size: 20px;
    //                             font-weight: 600;
    //                             color: #2d3748;
    //                             margin-bottom: 20px;
    //                             text-align: center;
    //                         }
    //                         .class-table {
    //                             width: 100%;
    //                             border-collapse: collapse;
    //                             margin: 20px 0;
    //                             background: white;
    //                             border-radius: 8px;
    //                             overflow: hidden;
    //                             box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    //                         }
    //                         .class-table th {
    //                             background: #8B5CF6;
    //                             color: white;
    //                             padding: 15px 12px;
    //                             font-weight: 600;
    //                             text-align: center;
    //                             border: 1px solid #e2e8f0;
    //                         }
    //                         .class-table td {
    //                             padding: 12px;
    //                             border: 1px solid #e2e8f0;
    //                             text-align: center;
    //                             background: white;
    //                         }
    //                         .class-table tr:nth-child(even) td {
    //                             background: #f8faf9;
    //                         }
    //                         .join-button {
    //                             display: inline-block;
    //                             background: #8B5CF6;
    //                             color: white;
    //                             padding: 15px 40px;
    //                             text-decoration: none;
    //                             border-radius: 8px;
    //                             font-weight: 600;
    //                             margin: 25px 0;
    //                             transition: background-color 0.3s;
    //                             font-size: 16px;
    //                         }
    //                         .join-button:hover {
    //                             background: rgb(217 99 9);
    //                         }
    //                         .footer {
    //                             background: #f8faf9;
    //                             padding: 30px;
    //                             text-align: center;
    //                             border-top: 1px solid #e2e8f0;
    //                         }
    //                         .footer-text {
    //                             color: #718096;
    //                             font-size: 14px;
    //                             margin: 5px 0;
    //                         }
    //                         .divider {
    //                             width: 60px;
    //                             height: 2px;
    //                             background: rgba(237,119,29,0.3);
    //                             margin: 15px auto;
    //                         }
    //                         @media only screen and (max-width: 600px) {
    //                             .email-container {
    //                                 margin: 0;
    //                             }
    //                             .header, .content {
    //                                 padding: 20px;
    //                             }
    //                             .logo-wrapper {
    //                                 padding: 15px 30px;
    //                             }
    //                             .notification-card {
    //                                 padding: 20px;
    //                             }
    //                             .class-table {
    //                                 font-size: 14px;
    //                             }
    //                             .class-table th, .class-table td {
    //                                 padding: 8px 5px;
    //                             }
    //                         }
    //                     </style>
    //                 </head>
    //                 <body>
    //                     <div class=\"email-container\">
    //                         <div class=\"top-accent\"></div>
                            
    //                         <div class=\"content\">
    //                             <div class=\"notification-card\">
    //                                 <div class=\"message-content\">
    //                                     <p>Dear {$toName},</p>
    //                                     <br>
    //                                     <p>We are pleased to inform you that live class has been scheduled for the subject <strong>{$cohort_data['subject_name']}</strong>.</p>

    //                                     <div class=\"class-details-section\">
    //                                         <h3 class=\"class-details-title\">Live Class Details</h3>
    //                                         <table class=\"class-table\">
    //                                             <thead>
    //                                                 <tr>
    //                                                     <th>Sl. No.</th>
    //                                                     <th>Topic</th>
    //                                                     <th>Date</th>
    //                                                     <th>Time</th>
    //                                                 </tr>
    //                                             </thead>
    //                                             <tbody>
    //                                                 {$tableRows}
    //                                             </tbody>
    //                                         </table>
    //                                     </div>
                                        
    //                                     <div style=\"text-align: center;\">
    //                                         <a href=\"#\" class=\"join-button\">[Join Now]</a>
    //                                     </div>
    //                                     <br>
    //                                     <p>Please ensure to join the session on time to make the most of this interactive learning opportunity.</p>
    //                                     <br>
    //                                     <p>If you have any questions or need assistance, feel free to contact us at <a href=\"mailto:support@teachersindia.in\" style=\"color: #8B5CF6;\">support@teachersindia.in</a>.</p>
    //                                     <br>
    //                                     <p>Best regards,<br><strong>Teachers' Training Institute of India</strong></p>
    //                                 </div>
    //                             </div>
    //                         </div>
                            
    //                         <div class=\"footer\">
    //                             <div class=\"divider\"></div>
    //                             <p class=\"footer-text\">© 2025 Teachers' Training Institute of India</p>
    //                             <p class=\"footer-text\">This email was sent to {$toEmail}</p>
    //                         </div>
    //                     </div>
    //                 </body>
    //                 </html>";

    //             // Send email to individual student
    //             send_email_message($toEmail, $toName, $subject, $bodyContent, 'TTII Education');
    //         }
    //     }
    // }


    // <div class=\"meeting-info\">
    //                             <div class=\"meeting-info-title\">🔗 Meeting Credentials</div>
    //                             <div class=\"meeting-detail\">
    //                                 <span class=\"meeting-label\">Zoom ID:</span>
    //                                 <span class=\"meeting-value\">{$zoom_id}</span>
    //                             </div>
    //                             <div class=\"meeting-detail\">
    //                                 <span class=\"meeting-label\">Password:</span>
    //                                 <span class=\"meeting-value\">{$zoom_password}</span>
    //                             </div>
    //                             <div class=\"meeting-detail\">
    //                                 <span class=\"meeting-label\">Cohort:</span>
    //                                 <span class=\"meeting-value\">{$cohort_data['course_name']}</span>
    //                             </div>
    //                         </div>
    




    // <div class=\"stats-grid\">
    //                             <div class=\"stat-box\">
    //                                 <div class=\"stat-label\">Total Classes</div>
    //                                 <div class=\"stat-value\">" . ($slNo - 1) . "</div>
    //                             </div>
    //                             <div class=\"stat-box\" style=\"border-left-color: #3b82f6; background: #eff6ff;\">
    //                                 <div class=\"stat-label\" style=\"color: #1e40af;\">Students</div>
    //                                 <div class=\"stat-value\" style=\"color: #1e3a8a;\">{$studentCount}</div>
    //                             </div>
    //                         </div>
}
