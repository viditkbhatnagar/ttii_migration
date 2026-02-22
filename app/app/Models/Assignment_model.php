<?php namespace App\Models;

use CodeIgniter\Model;
use App\Models\Payment_model;
use App\Models\Users_model;
use App\Models\Course_model;
use App\Models\Saved_assignments_model;
use App\Models\Assignment_submissions_model;
use App\Models\Cohort_students_model;

class Assignment_model extends Base_model
{
    protected $table         = 'assignment';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Assignment';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    

    public function get_submissions($where = []){
        $this->assignment_submissions_model = new Assignment_submissions_model();
        
        // Check if 'assignment_id' is in the where array
        if (isset($where['assignment_id'])) {
            $this->assignment_submissions_model->where('assignment_id', $where['assignment_id']);
        }
        
        $all_submissions = $this->assignment_submissions_model->get_join(
        [['users','users.id = user_id'],['assignment','assignment.id = assignment_id'],['course','course.id = assignment_submissions.course_id']],
        ['assignment_submissions.user_id!= ' => null,'assignment_submissions.assignment_id' => $where['assignment_id'] ],
        ['assignment_submissions.user_id','assignment_submissions.id as submission_id','name as student_name','student_id','profile_picture','assignment.*','assignment_id','assignment_submissions.course_id','course.title as course_title','assignment_files','marks','remarks','assignment_submissions.created_at as submitted_time'])->getResultArray();
        //log_message('error', 'All submissions fetched: ' . print_r($all_submissions, true));
        return $all_submissions;
    }


    public function get_unsubmissions($where = [])
    {
        $this->cohort_students = new Cohort_students_model();

        $all_unsubmissions = $this->cohort_students->get_join(
            [
                // join assignment first
                ['assignment','assignment.cohort_id = cohort_students.cohort_id'],

                // then join user + course
                ['users','users.id = cohort_students.user_id'],
                ['course','course.id = assignment.course_id'],

                // LEFT join submissions to find missing ones
                [
                    'assignment_submissions',
                    'assignment_submissions.user_id = cohort_students.user_id 
                    AND assignment_submissions.assignment_id = assignment.id',
                    'left'
                ]
            ],
            [
                'assignment.id' => $where['assignment_id'],
                'assignment_submissions.id IS NULL' => null
            ],
            [
                'users.id as user_id',
                'users.name as student_name',
                'users.student_id',
                'users.profile_picture',
                'assignment.id as assignment_id',
                'assignment.title',
                'course.title as course_title'
            ]
        )->getResultArray();

        return $all_unsubmissions;
    }

    
    public function get_user_assignments($cohort_id=null, $user_id = null, $subject_id = null)
    {
        $this->users_model = new Users_model();

        // Build query to join cohorts and filter by subject_id if passed
        $builder = $this->db->table('assignment')
            ->select('assignment.*')
            ->join('cohorts', 'cohorts.id = assignment.cohort_id')
            ->where('assignment.cohort_id', $cohort_id)
            ->where('assignment.deleted_at',null)
            ->where('cohorts.deleted_at',null);

        // if (!empty($subject_id)) {
        //     $builder->where('cohorts.subject_id', $subject_id);
        // }


        $assignments = $builder->get()->getResultArray();

        $ass_data = [];
        foreach ($assignments as $ass) {
            $ass_data[] = $this->assignment_data($ass, $user_id);
        }

        return $ass_data;
    }



    
    
    
    public function assignment_data($assignment, $user_id = null)
    {
        $this->users_model = new Users_model();
        $this->saved_assignments_model = new Saved_assignments_model();
        $this->assignment_submissions_model = new Assignment_submissions_model();
    
        // Get the current date
        $currentDate = date("Y-m-d");
        
        // Convert due_date to a comparable date format
        $dueDate = date("Y-m-d", strtotime($assignment['due_date']));
        
       $is_submitted = $this->assignment_submissions_model
        ->get(['user_id' => $user_id, 'assignment_id' => $assignment['id']])
        ->getNumRows();

        // Determine status based on submission
        if ($is_submitted > 0) {
            $status = "Completed";
        } else {
            $status = "Current";
        }
        // // Determine the status based on the due_date
        // if ($dueDate == $currentDate) {
        //     $status = "Current"; // If due_date is today
        // } elseif ($dueDate < $currentDate) {
        //     $status = "Due date Completed"; // If due_date is in the past
        // } else {
        //     $status = "Upcoming"; // If due_date is in the future
        // }
        
        
         // Initialize an empty array to store the result
        $instruction = [];
        
        // Use regular expressions to extract the content between <li> and </li>
        preg_match_all('/<li>(.*?)<\/li>/', $assignment['instructions'], $matches_li);
        foreach ($matches_li[1] as $item) {
            $instruction[] = cleanHTMLText($item); // Add each matched item as an array element
        }
    
        // Extract content between <p> and </p>
        preg_match_all('/<p>(.*?)<\/p>/', $assignment['instructions'], $matches_p);
        foreach ($matches_p[1] as $item) {
            $instruction[] = cleanHTMLText($item); // Add each matched item as an array element
        }
        
        $is_submitted = $this->assignment_submissions_model->get(['user_id' => $user_id, 'assignment_id' => $assignment['id']])->getNumRows();
        $submitted_files = [];
        $is_reviewed = 0;
        if($is_submitted > 0){
            $submit_data = $this->assignment_submissions_model->get(['user_id' => $user_id, 'assignment_id' => $assignment['id']])->getRowArray();
            if(!empty($submit_data['marks']) && !empty($submit_data['remarks'])){
                $is_reviewed = 1;
            }
            if (!empty($submit_data['assignment_files'])) {
                foreach (json_decode($submit_data['assignment_files'], true) as $answer) {
                    $submitted_files[] = [
                        'file' => base_url(get_file($answer)),
                        'date' => !empty($submit_data['created_at']) 
                                ? date('d-m-Y', strtotime($submit_data['created_at'])) 
                                : ''
                    ];
                }
            }
        }
        else{
            $submit_data['marks'] = '';
            $submit_data['remarks'] = '';
        }
    
        // Prepare the event data
        $event_data = [
            'id'            => $assignment['id'] ?? '',
            'title'         => $assignment['title'] ?? '',
            'description'   => $assignment['description'] ?? '',
            'total_marks'   => $assignment['total_marks'] ?? '',
            'instruction'   => $instruction ?? '',
            'date'          => date('d-m-Y', strtotime($assignment['due_date'])) ?? '',
            'formatted_date'=> date('d M Y', strtotime($assignment['due_date'])) ?? '',
            'time'          => date('h:i A', strtotime($assignment["from_time"])) . " to " . date('h:i A', strtotime($assignment["to_time"])),
            'file'          =>valid_file($assignment['file']) ? base_url(get_file($assignment['file'])) : '',
            'status'        => $status,
            'is_saved'      => $this->saved_assignments_model->get(['user_id' => $user_id, 'assignment_id' => $assignment['id']])->getNumRows(),
            'is_submitted'  => $this->assignment_submissions_model->get(['user_id' => $user_id, 'assignment_id' => $assignment['id']])->getNumRows(),
            'is_reviewed'   => $is_reviewed,
            'remarks' =>  $submit_data['remarks'],
            'marks'=> isset($assignment['total_marks']) ? $submit_data['marks'] . '/' . $assignment['total_marks'] : $submit_data['marks'] . '/0',
            'submitted_file' =>$submitted_files

        ];
       
        return $event_data;
    }



}
