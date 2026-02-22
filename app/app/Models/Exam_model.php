<?php namespace App\Models;

use CodeIgniter\Model;
use CodeIgniter\Database\ConnectionInterface;
use App\Models\Exam_questions_model;
use App\Models\Exam_attempt_model;



class Exam_model extends Base_model
{
    protected $table         = 'exam';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Quiz';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
    
    public function exam_data($exam,$user_id){
        $this->exam_questions_model = new Exam_questions_model();
        $this->payment_model = new Payment_model();
        $this->exam_attempt_model = new Exam_attempt_model();

        $purchase_status = $this->payment_model->user_purchase_status($user_id, $exam['course_id']);
        
        $examdata = [
            'id' => $exam['id'] ?? '',
            'title' => $exam['title'] ?? '',
            'description' => $exam['description'] ?? '',
            'total_mark' => $exam['mark'] ?? '',
            'duration' => $exam['duration'] ?? '',
            // 'category_id' => $exam['category_id'] ?? '',
            // 'course_id' => $exam['course_id'] ?? '',
            // 'subject_id' => $exam['subject_id'] ?? '',
            // 'lesson_id' => $exam['lesson_id'] ?? '',
            // 'duration' => $this->format_duration($exam['duration']) ?? '',
            // 'publish_result' => $exam['publish_result'] ?? '',
            'date' => date('d/m/Y', strtotime($exam['from_date'])) ?? '',
            'free' => $exam['free'] == '1' ? 'on' : $purchase_status,
            'questions_count' => $this->exam_questions_model->get(['exam_id' => $exam['id']])->getNumRows(). ' Questions',
            'is_attempted'  => $this->exam_attempt_model->get(['exam_id' => $exam['id'], 'user_id' => $user_id, 'submit_status' => 1])->getNumRows() > 0 ? 1 : 0,

            'exam_link' => base_url('exam/exam_web_view/'.$exam['id'].'/'.$user_id),
        ];
        return $examdata;
    }
    
    // public function get_exam_calendar($exams,$user_id)
    // {
        
        
    //     if ($goal && isset($goal['start_date']) && isset($goal['end_date'])) {
    //         // Use the global namespace for DateTime
    //         $startDate = new \DateTime($goal['start_date']);
    //         $endDate = new \DateTime($goal['end_date']);
    //         $today = new \DateTime(); // Get today's date
            
    //         // Calculate the difference
    //         $interval = $startDate->diff($endDate);
            
    //         // Get total days
    //         $totalDays = $interval->days + 1;
            
    //         // Generate date array with status based on date comparison
    //         $dateArray = [];
    //         $completedDays = 0;
    //         $todayStatus = 0;
    //         $currentDate = clone $startDate;
            
    //         while ($currentDate <= $endDate) 
    //         {
    //             // Check goal existence for the current date
    //             $check_goal = $this->get(['user_id' => $user_id, 'goal_id' => $goal_id, 'date' => $currentDate->format('Y-m-d')])->getNumRows();
                
    //             if ($check_goal > 0) {
    //                 $status = "1"; // Set status to "1" if there's a record for this date
    //             } elseif ($currentDate < $today) {
    //                 $status = "2"; // Set status to "2" for past dates with no goal
    //             } else {
    //                 $status = "0"; // Set status to "0" if upcoming and no record exists
    //             }
                
    //             // Count completed days with status = 1
    //             if ($status == "1") {
    //                 $completedDays++;
    //             }
                
    //             // Check today's status
    //             if ($currentDate->format('Y-m-d') == $today->format('Y-m-d')) {
    //                 $todayStatus = ($status == "1") ? 1 : 0;
    //             }
                
    //             // Append the date and status to the array
    //             $dateArray[] = [
    //                 "date" => $currentDate->format('d-m-Y'),
    //                 "status" => $status
    //             ];
    //             $currentDate->modify('+1 day');
    //         }
            
    //         // Calculate progress as a percentage
    //         $progress = $totalDays>0 ? round(($completedDays / $totalDays) * 100) : 0;
        
    //         // Add total days and date array to the goal array
    //         $goal = [
    //             "id" => $goal['id'],
    //             "title" => $goal['title'],
    //             "today_status" => $todayStatus, // Assuming today is completed
    //             "progress" => $progress, // Placeholder value for progress
    //             "completed_days" => $completedDays, // Placeholder value for completed days
    //             "total_days" => $totalDays,
    //             "start_date" => date('d-m-Y', strtotime($goal['start_date'])),
    //             "end_date" => date('d-m-Y', strtotime($goal['end_date'])),
    //             "date_array" => $dateArray // Generated date array
    //         ];
    //     }
        
    //     return $goal;
    // }
    
    
    public function get_exam_calendar($exams, $user_id)
    {
        // Initialize the goal data
        $calendar_date = null;
    
        if ($exams && count($exams) > 0) 
        {
            $startDate = new \DateTime($exams[0]['from_date']); // Exam start date
            $endDate = new \DateTime(end($exams)['from_date']); // Last exam date (assuming exams are sorted)
    
            $today = new \DateTime(); 
    
            $interval = $startDate->diff($endDate);
            $totalDays = $interval->days + 1;
    
            $dateArray = [];
            $completedExams = 0;
            $todayStatus = 0;
            $currentDate = clone $startDate;
    
            while ($currentDate <= $endDate) {
                $examOnDate = array_filter($exams, function($exam) use ($currentDate) {
                    return $exam['from_date'] == $currentDate->format('Y-m-d');
                });
                
                $isAttended = 0;

                if (count($examOnDate) > 0) {
                    $status = "1"; // Exam is scheduled on this date
                } elseif ($currentDate < $today) {
                    $status = "2"; // Past date with no exam
                } else {
                    $status = "0"; // Upcoming date with no exam
                }
    
                if ($status == "1") {
                    $completedExams++;
                }
    
                if ($currentDate->format('Y-m-d') == $today->format('Y-m-d')) {
                    $todayStatus = ($status == "1") ? 1 : 0;
                }
    
                $dateArray[] = [
                    "date" => $currentDate->format('d-m-Y'),
                    "status" => $status
                ];
                $currentDate->modify('+1 day');
            }
    
            $progress = $totalDays > 0 ? round(($completedExams / $totalDays) * 100) : 0;
    
            $calendar_date = [
                "id" => 0, // You can add goal ID if needed
                "title" => "Exam Schedule", // You can modify the title
                "today_status" => $todayStatus, 
                "progress" => $progress,
                "completed_exams" => $completedExams,
                "total_days" => $totalDays,
                "start_date" => date('d-m-Y', strtotime($startDate->format('Y-m-d'))),
                "end_date" => date('d-m-Y', strtotime($endDate->format('Y-m-d'))),
                "date_array" => $dateArray
            ];
        }
    
        return $calendar_date;
    }
    
    
    public function get_calendar_empty($exams = [])
    {
        // Initialize the calendar data
        $calendar_date = null;
        $today = new \DateTime();
        
        // If exams are not provided or empty, generate an empty calendar
        if (!$exams || count($exams) == 0) {
            $calendar_date = [
                "id" => 0,
                "title" => "Exam Schedule",
                "today_status" => 0,
                "progress" => 0,
                "completed_exams" => 0,
                "total_days" => 1,
                "start_date" => $today->format('d-m-Y'),
                "end_date" => $today->format('d-m-Y'),
                "date_array" => [
                    [
                        "date" => $today->format('d-m-Y'),
                        "status" => "0" // No exams scheduled
                    ]
                ]
            ];
            return $calendar_date;
        }
    
        return $calendar_date;
    }


    
    
    function format_duration($duration) {
        // Split the duration string into hours, minutes, and seconds
        list($hours, $minutes, $seconds) = explode(':', $duration);
        
        // Convert hours, minutes, and seconds into integers
        $hours = (int) $hours;
        $minutes = (int) $minutes;
        $seconds = (int) $seconds;
        
        // If hours are greater than 0, display in "H:i hrs" format
        if ($hours > 0) {
            return $hours . ':' . str_pad($minutes, 2, '0', STR_PAD_LEFT) . ' hrs';
        }
    
        // If hours are 0 but minutes are greater than 0, display in "i mins" format
        if ($minutes > 0) {
            return $minutes . ' mins';
        }
        
        // If the duration is less than a minute, display "less than a minute"
        return 'Less than a minute';
    }


    
    public function get_all_test_attempts($exam_id, $user_id, $is_completed = false) {
        $builder = $this->db->table('exam_attempt');
        $builder->where('exam_id', $exam_id);
        $builder->where('user_id', $user_id);
        
        if ($is_completed) {
            $builder->where('submit_status', 1);
        }
        
        return $builder->get();
    }

    
    public function get_test_single($id) {
        $builder = $this->db->table('exam');
        $builder->where('id', $id);
        
        return $builder->get()->getRowArray();
    }

    
    public function get_test_question($exam_id) {
        $builder = $this->db->table('exam_questions');
        $builder->select('question_bank.*, exam_questions.question_no, exam_questions.mark, 
            exam_questions.negative_mark, question_bank.range_from, question_bank.range_to');
        $builder->join('question_bank', 'exam_questions.question_id = question_bank.id');
        $builder->where('exam_questions.exam_id', $exam_id);
        $builder->orderBy('exam_questions.question_no', 'asc');
        
        return $builder->get()->getResultArray();
    }

    
    public function get_upcoming_exams($course_id){
        $current_date = date('Y-m-d');
        $current_time = date('H:i:s');
        
        $query = $this->db->table('exam')
                  ->where('course_id', $course_id)
                  ->where('from_date >=', $current_date)
                  ->groupStart()
                  ->where('deleted_at', null)
                  ->where('to_date >', $current_date)
                  ->orWhere('to_date', $current_date)
                  ->where('to_time >=', $current_time)
                  ->groupEnd();
        return $query->get()->getResultArray();

    }
    
}
