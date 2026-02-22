<?php
namespace App\Controllers\Admin;
use App\Models\Course_model;
use App\Models\Subject_model;
use App\Models\Users_model;
use App\Models\Cohorts_model;
use App\Models\Cohort_students_model;
use App\Models\Languages_model;
use App\Models\Live_class_model;
use App\Models\Cohort_announcements_model;
use App\Models\Assignment_model;
use App\Models\Instructor_enrol_model;
use Google\Service\Analytics\Resource\Data;

class Cohorts extends AppBaseController
{
    protected $course_model;
    protected $subject_model;
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
        $this->subject_model = new Subject_model();
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

        $filter = [];

        $filter['centre_id'] = null;
        if(!empty($this->request->getGet('cohort_date'))){
            $cohort_date = $this->request->getGet('cohort_date');
            if (!empty($cohort_date)) {
                [$year, $month] = explode('-', $cohort_date);
                $start_date = "{$year}-{$month}-01 00:00:00";
                $end_date = date('Y-m-t 23:59:59', strtotime($start_date));

                $filter['start_date >='] = $start_date;
                $filter['start_date <='] = $end_date;
            }
        }

        if (!empty($this->request->getGet('status'))) {
            $status = $this->request->getGet('status');
            if($status == 'active'){
                $filter['start_date <='] = date('Y-m-d H:i:s');
                $filter['end_date >='] = date('Y-m-d H:i:s');
            }
            elseif($status == 'completed'){
                $filter['end_date <'] = date('Y-m-d H:i:s');
            }
        }

        if (!empty($this->request->getGet('language'))) {
            $language = $this->request->getGet('language');
            $filter['language_id'] = $language;
        }

        if (!empty($this->request->getGet('course'))) {
            $course = $this->request->getGet('course');
            $filter['course_id'] = $course;
        }

        if (!empty($this->request->getGet('subject'))) {
            $subject = $this->request->getGet('subject');
            $filter['subject_id'] = $subject;
        }
        
        if (!empty($this->request->getGet('instructor'))) {
            $instructor = $this->request->getGet('instructor');
            $filter['instructor_id'] = $instructor;
        }


        // List by

        if (!empty($this->request->getGet('list_by'))) {
            $list_by = $this->request->getGet('list_by');
            if($list_by == 'active'){
                $filter['start_date <='] = date('Y-m-d H:i:s');
                $filter['end_date >='] = date('Y-m-d H:i:s');
            }
            elseif($list_by == 'completed'){
                $filter['end_date <'] = date('Y-m-d H:i:s');
            }
        }


        if(is_admin()){
        $this->data['list_items'] = $this->cohorts_model->get($filter)->getResultArray();
        }
        else{
            $filter['instructor_id'] = get_user_id();
            $this->data['list_items'] = $this->cohorts_model->get($filter)->getResultArray();
        }

        

        // Collect all course IDs
        $course_ids = array_column($this->data['list_items'], 'course_id');
        // Fetch all related courses in one query
        $courses = [];
        if (!empty($course_ids)) {
            $course_rows = $this->course_model->get(['id' => $course_ids])->getResultArray();  

            // Index courses by ID for quick lookup
            $courses = array_column($course_rows, 'title', 'id');
        }
        // Map courses to list_items
        foreach ($this->data['list_items'] as &$item) {
            $item['course_name'] = $courses[$item['course_id']] ?? null;
        }
        unset($item); 


        $subject_ids = array_column($this->data['list_items'], 'subject_id');
        $subjects = [];
        if (!empty($subject_ids)) {
            $subject_rows = $this->subject_model->get(['id' => $subject_ids])->getResultArray();

            // Index subjects by ID for quick lookup
            $subjects = array_column($subject_rows, 'title', 'id');
            foreach ($this->data['list_items'] as &$item) {
                $item['subject_name'] = $subjects[$item['subject_id']] ?? null;
            }
            unset($item);
        }



        $language_ids = array_column($this->data['list_items'], 'language_id');
        $languages = [];
        if (!empty($language_ids)) {
            $language_rows = $this->languages_model->get(['id' => $language_ids])->getResultArray();

            // Index languages by ID for quick lookup
            $languages = array_column($language_rows, 'title', 'id');
            foreach ($this->data['list_items'] as &$item) {
                $item['language_name'] = $languages[$item['language_id']] ?? null;
            }
            unset($item);
        }
        
        

        $instructor_ids = array_column($this->data['list_items'], 'instructor_id');
        $instructors = [];
        if (!empty($instructor_ids)) {
            $instructor_rows = $this->users_model->get(['id' => $instructor_ids])->getResultArray();

            // Index instructors by ID for quick lookup
            $instructors = array_column($instructor_rows, 'name', 'id');

            foreach ($this->data['list_items'] as &$item) {
                $item['instructor_name'] = $instructors[$item['instructor_id']] ?? null;
            }
            unset($item);
        }
        
        $cohort_ids = array_column($this->data['list_items'], 'id');

        if (!empty($cohort_ids)) {
            // Get all students in one query
            $cohort_students = $this->cohort_students_model->get(['cohort_id' => $cohort_ids])->getResultArray();

            // Group user_ids by cohort_id
            $students_by_cohort = [];
            foreach ($cohort_students as $row) {
                $students_by_cohort[$row['cohort_id']][] = $row['user_id'];
            }

            // Get all live classes in one query
            $live_classes = $this->live_class_model->get(['cohort_id' => $cohort_ids])->getResultArray();

            // Count live classes per cohort
            $classes_by_cohort = [];
            foreach ($live_classes as $row) {
                $classes_by_cohort[$row['cohort_id']] =
                    ($classes_by_cohort[$row['cohort_id']] ?? 0) + 1;
            }

            // Merge results into your list_items
            foreach ($this->data['list_items'] as &$item) {
                $item['students_count'] = isset($students_by_cohort[$item['id']])
                    ? count($students_by_cohort[$item['id']])
                    : 0;

                $item['lives_classes_count'] = $classes_by_cohort[$item['id']] ?? 0;
            }
            unset($item);
        }

        
        $this->data['course'] = $this->course_model->get()->getResultArray();
        $this->data['language'] = $this->languages_model->get()->getResultArray();
        $this->data['subject'] = $this->subject_model->get(['master_subject_id !=' => null],null,null,null,['title'])->getResultArray();
        $this->data['instructor'] = $this->users_model->get(['role_id' => 3])->getResultArray();
        $this->data['page_title'] = 'Cohorts';
        $this->data['page_name'] = 'Cohorts/index';
        return view('Admin/index', $this->data);
    }
    
    // public function view($id){
        
    //     $this->data['list_items'] = $this->cohorts_model->get(['id' => $id])->getRowArray();
    //     $this->data['course'] = $this->course_model->get(['id' => $this->data['list_items']['course_id'],'status' => 'published'])->getRowArray();
    //     $this->data['language'] = $this->languages_model->get(['id' => $this->data['list_items']['language_id']])->getRowArray();
    //     $this->data['instructor'] = $this->users_model->get(['id' => $this->data['list_items']['instructor_id']])->getRowArray();
    //     $this->data['students'] = $this->cohort_students_model->get(['cohort_id' => $id])->getResultArray();
        
    //     foreach($this->data['students'] as $index => $student){
    //         $students = $this->users_model->get(['id' => $student['user_id']])->getRowArray();
    //         $this->data['students'][$index]['student_id'] = $students['student_id'];
    //         $this->data['students'][$index]['name'] = $students['name'];
    //         $this->data['students'][$index]['email'] = $students['user_email'];
    //     }
    //     // $this->data['live_class'] = $this->live_class_model->get()->getResultArray();
    //     // $this->data['assignments'] = $this->assignment_model->get()->getResultArray();
    //     $this->data['announcements'] = $this->cohort_announcements_model->get(['cohort_id' => $id])->getResultArray();
        
    //     $this->data['page_title'] = 'Cohort Details';
    //     $this->data['page_name'] = 'Cohorts/view';
    //     return view('Admin/index', $this->data);
    // }

    public function view($id){
        
        $this->data['edit_data'] = $this->cohorts_model->get(['id' => $id])->getRowArray();
        
        $this->data['course'] = $this->course_model->get(['status' => 'published'])->getResultArray();
        $this->data['language'] = $this->languages_model->get()->getResultArray();
        
        $instructor = $this->users_model->get(['id' => $this->data['edit_data']['instructor_id']])->getRowArray();

        $this->data['students'] = $this->cohort_students_model->get(['cohort_id' => $id])->getResultArray();
        //log_message('error', print_r($this->data['students'], true)); 
        $assigned_user_ids = array_column($this->data['students'], 'user_id');
        
        
        foreach ($this->data['students'] as $index => $student) {
            $user = $this->users_model->get(['id' => $student['user_id']])->getRowArray();
            if ($user) {
                $this->data['students'][$index]['student_id'] = $user['student_id'] ?? '';
                $this->data['students'][$index]['name'] = $user['name'] ?? '';
                $this->data['students'][$index]['email'] = $user['user_email'] ?? '';
                $this->data['students'][$index]['profile_picture'] = $user['profile_picture'] ?? '';
            }
        }
        
       

        $subject_id = $this->data['edit_data']['subject_id'];

        
        // Step 2: Find all students in ANY cohort with this subject
        $students_in_same_subject = $this->db->table('cohort_students cs')
            ->join('cohorts c', 'c.id = cs.cohort_id')
            ->where('c.subject_id', $subject_id)
            ->where('cs.deleted_at', null) // Ensure we only consider active students
            ->select('cs.user_id')
            ->get()
            ->getResultArray();

        
        $exclude_ids = array_column($students_in_same_subject, 'user_id');


        $builder = $this->db->table('users s')
            ->where('s.role_id', 2) // only students
            ->where('s.deleted_at', null)
            ->select('s.id as user_id, s.name, s.student_id');

        if (!empty($exclude_ids)) {
            $builder->whereNotIn('s.id', $exclude_ids);
        }

        $this->data['learners'] = $builder->get()->getResultArray();
        
        // get all the students
        // $this->data['students'] = $this->users_model->get(['role_id' => 2])->getResultArray();
        // get all the students who are not already in a cohort
        

        // $this->data['learners'] = $learners;
        if(is_admin()){
            $this->data['live_class'] = $this->live_class_model->get(['cohort_id' => $id])->getResultArray();
        }
        elseif(is_instructor()){
            $this->data['live_class'] = $this->live_class_model->get(['cohort_id' => $id])->getResultArray(); //in future change
        }
        
        // $this->data['assignments'] = $this->assignment_model->get_join([
        //                                                                     ['course', 'assignment.course_id = course.id']
        //                                                                 ],['cohort_id' => $id],
        //                                                                 ['assignment.*','course.title as course_title']
        //                                                             )->getResultArray();

        $this->data['assignments_count'] = $this->assignment_model->get_join([
                                                                            ['course', 'assignment.course_id = course.id']
                                                                        ],['cohort_id' => $id],
                                                                        ['assignment.*','course.title as course_title']
                                                                    )->getNumRows();

        // $this->data['announcements'] = $this->cohort_announcements_model->get(['cohort_id' => $id])->getResultArray();
                                     
        if(!empty($instructor)){
            $this->data['view_data']['instructor_image'] = $instructor['profile_picture'];
            $this->data['view_data']['instructor_name'] = $instructor['name'];
        }

        $course_title = array_column($this->data['course'], 'title', 'id');
        $this->data['view_data']['course_name'] = $course_title[$this->data['edit_data']['course_id']];
        $this->data['view_data']['subject_name'] = $this->subject_model->get(['id' => $this->data['edit_data']['subject_id']])->getRowArray()['title'];
        $language_title = array_column($this->data['language'], 'title', 'id');
        $this->data['view_data']['language_name'] = $language_title[$this->data['edit_data']['language_id']] ?? '';

        $this->data['page_title'] = 'Cohort Edit';
        $this->data['page_name'] = 'Cohorts/view';
        
        //log_message('error',print_r($this->data['learners'],true));
        
        return view('Admin/index', $this->data);
    }

    public function load_cohort_assignments($id){
        $this->data['assignments'] = $this->assignment_model->get_join([
                                                                            ['course', 'assignment.course_id = course.id'],
                                                                            ['cohorts', 'assignment.cohort_id = cohorts.id']
                                                                        ],['assignment.cohort_id' => $id],
                                                                        ['assignment.*','course.title as course_title','cohorts.title as cohort_title']
                                                                    )->getResultArray();


        $this->data['edit_data']['id'] = $id;
        return view('Admin/Assignment/cohort_assignments_index', $this->data);                                                            
    }


    public function ajax_assignment_details()
    {
        $assignment_id = $this->request->getPost('id');
        if (!$assignment_id) {
            return $this->response->setJSON(['status' => 'error', 'message' => 'No assignment id']);
        }

        $assignment = $this->assignment_model
            ->get_join(
                [['course', 'assignment.course_id = course.id'],['cohorts', 'assignment.cohort_id = cohorts.id']],
                ['assignment.id' => $assignment_id],
                ['assignment.*', 'course.title as course_title', 'cohorts.title as cohort_title']
            )
            ->getRowArray();

        if (!$assignment) {
            return $this->response->setJSON(['status' => 'error', 'message' => 'Assignment not found']);
        }

        $submission_count = $this->assignment_model->get_submissions(['assignment_id' => $assignment_id]);
        $assignment['submission_count'] = count($submission_count);

        $data = [
            'status' => 'success',
            'title' => $assignment['title'] ?? '',
            'description' => $assignment['description'] ?? '',
            'added_date' => !empty($assignment['added_date']) ? date('d-m-Y', strtotime($assignment['added_date'])) : '',
            'due_date' => !empty($assignment['due_date']) ? date('d-m-Y', strtotime($assignment['due_date'])) : '',
            'from_time' => !empty($assignment['from_time']) ? date('h:i A', strtotime($assignment['from_time'])) : '',
            'to_time' => !empty($assignment['to_time']) ? date('h:i A', strtotime($assignment['to_time'])) : '',
            'file' => !empty($assignment['file']) ? base_url(get_file($assignment['file'])) : '',
            'course' => $assignment['course_title'] ?? '',
            'cohort' => $assignment['cohort_title'] ?? '',
            'instructions' => $assignment['instructions'] ?? '',
            'submission_count' => $assignment['submission_count'],
            'total_marks' => $assignment['total_marks'] ?? 0
        ];

        return $this->response->setJSON($data);
    }

    public function ajax_show_submissions()
    {
        $assignment_id = $this->request->getPost('assignment_id'); // fixed to match JS data
        $submissions = $this->assignment_model->get_submissions(['assignment_id' => $assignment_id]);
        return view('Admin/Assignment/ajax_show_submissions', ['submissions' => $submissions]);
    }

    public function ajax_show_unsubmissions()
    {
        $assignment_id = $this->request->getPost('assignment_id'); // fixed to match JS data
        $unsubmissions = $this->assignment_model->get_unsubmissions(['assignment_id' => $assignment_id]);
        return view('Admin/Assignment/ajax_show_unsubmissions', ['unsubmissions' => $unsubmissions]);
    }



    public function load_cohort_announcements($id){
        $this->data['announcements'] = $this->cohort_announcements_model->get(['cohort_id' => $id])->getResultArray();

        $this->data['edit_data']['id'] = $id;
        return view('Admin/Announcement/cohort_announcement_index', $this->data);                                                            
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
            ->where('users.deleted_at', null)
            ->get()
            ->getResultArray();
    }




    //calling this fucntion in cohort_add view using ajax
    public function get_students_not_in_subject()
    {
        $cohort_id = $this->request->getGet('cohort_id');

        // Step 1: Get the subject of the given cohort
        $cohort = $this->db->table('cohorts')
            ->select('subject_id')
            ->where('id', $cohort_id) // fixed: should be "id" not "cohort_id"
            ->get()
            ->getRowArray();

        if (!$cohort) {
            return $this->response->setJSON([]);
        }

        $subject_id = $cohort['subject_id'];

        // Step 2: Find all students in ANY cohort with this subject
        $students_in_same_subject = $this->db->table('cohort_students cs')
            ->join('cohorts c', 'c.id = cs.cohort_id')
            ->where('c.subject_id', $subject_id)
            ->where('cs.deleted_at', null) // Ensure we only consider active students
            ->select('cs.user_id')
            ->get()
            ->getResultArray();

        $exclude_ids = array_column($students_in_same_subject, 'user_id');

        // Step 3: Get all students NOT in those IDs
        $builder = $this->db->table('users s')
            ->where('s.role_id', 2) // only students
            ->where('s.deleted_at', null)
            ->select('s.id as user_id, s.name, s.student_id');

        if (!empty($exclude_ids)) {
            $builder->whereNotIn('s.id', $exclude_ids);
        }

        $students = $builder->get()->getResultArray();

        return $this->response->setJSON($students);
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
                    'data' => [
                        'cohort_id'  => $inserted_id,
                        'subject_id' => $data['subject_id'] // pass subject_id back
                    ],
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
        log_message('error', print_r($this->data['students'], true)); 
        $assigned_user_ids = array_column($this->data['students'], 'user_id');
        
        
        foreach ($this->data['students'] as $index => $student) {
            $user = $this->users_model->get(['id' => $student['user_id']])->getRowArray();
            if ($user) {
                $this->data['students'][$index]['student_id'] = $user['student_id'] ?? '';
                $this->data['students'][$index]['name'] = $user['name'] ?? '';
                $this->data['students'][$index]['email'] = $user['user_email'] ?? '';
                $this->data['students'][$index]['profile_picture'] = $user['profile_picture'] ?? '';
            }
        }
        
       

        $subject_id = $this->data['edit_data']['subject_id'];

        
        // Step 2: Find all students in ANY cohort with this subject
        $students_in_same_subject = $this->db->table('cohort_students cs')
            ->join('cohorts c', 'c.id = cs.cohort_id')
            ->where('c.subject_id', $subject_id)
            ->where('cs.deleted_at', null) // Ensure we only consider active students
            ->select('cs.user_id')
            ->get()
            ->getResultArray();

        
        $exclude_ids = array_column($students_in_same_subject, 'user_id');


        $builder = $this->db->table('users s')
            ->where('s.role_id', 2) // only students
            ->where('s.deleted_at', null)
            ->select('s.id as user_id, s.name, s.student_id');

        if (!empty($exclude_ids)) {
            $builder->whereNotIn('s.id', $exclude_ids);
        }

        $this->data['learners'] = $builder->get()->getResultArray();
        
        




        
        // get all the students
        // $this->data['students'] = $this->users_model->get(['role_id' => 2])->getResultArray();
        // get all the students who are not already in a cohort
        

        // $this->data['learners'] = $learners;
        if(is_admin()){
            $this->data['live_class'] = $this->live_class_model->get(['cohort_id' => $id])->getResultArray();
        }
        elseif(is_instructor()){
            $this->data['live_class'] = $this->live_class_model->get(['cohort_id' => $id])->getResultArray(); //in future change
        }
        
        $this->data['assignments'] = $this->assignment_model->get_join([
                                                                            ['course', 'assignment.course_id = course.id']
                                                                        ],['cohort_id' => $id],
                                                                        ['assignment.*','course.title as course_title']
                                                                    )->getResultArray();
        $this->data['announcements'] = $this->cohort_announcements_model->get(['cohort_id' => $id])->getResultArray();
        
        $this->data['page_title'] = 'Cohort Edit';
        $this->data['page_name'] = 'Cohorts/cohort_edit';
        
        //log_message('error',print_r($this->data['learners'],true));
        
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
    
    public function add_vimeo_link($live_class_id){
        $this->data['live_class_id'] = $live_class_id;
        $this->data['video_url'] =  $this->live_class_model->get(['id' => $live_class_id])->getRow()->video_url ?? '';
        echo view('Admin/Live_class/vimeo_link_add', $this->data);
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

    public function assignments_edit($id)
    {
        $this->data['course'] = $this->course_model->get(['status' => 'published'])->getResultArray();
        $this->data['cohort_id'] = $this->assignment_model->get(['id' => $id])->getRow()->cohort_id ?? '';
        $this->data['edit_data'] = $this->assignment_model->get(['id' => $id])->getRowArray();

        log_message('error', print_r($this->data['edit_data'], true));
        echo view('Admin/Assignment/cohort_assignments_edit', $this->data);
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

    public function ajax_add_learner($subject_id=null,$cohort_id=null){
        
        // Step 2: Find all students in ANY cohort with this subject
        $students_in_same_subject = $this->db->table('cohort_students cs')
            ->join('cohorts c', 'c.id = cs.cohort_id')
            ->where('c.subject_id', $subject_id)
            ->where('cs.deleted_at', null) // Ensure we only consider active students
            ->select('cs.user_id')
            ->get()
            ->getResultArray();

        
        $exclude_ids = array_column($students_in_same_subject, 'user_id');


        $builder = $this->db->table('users s')
            ->where('s.role_id', 2) // only students
            ->where('s.deleted_at', null)
            ->select('s.id as user_id, s.name, s.student_id,s.profile_picture');

        if (!empty($exclude_ids)) {
            $builder->whereNotIn('s.id', $exclude_ids);
        }

        $this->data['learners'] = $builder->get()->getResultArray();
        $this->data['cohort_id'] = $cohort_id;
        echo view('Admin/Cohorts/ajax_add_learner', $this->data);
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
                <title>Application Received</title>
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
                    .application-details { background: #f8faf9; padding: 25px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #8B5CF6; }
                    .application-details h3 { font-size: 18px; font-weight: 600; color: #2d3748; margin-bottom: 15px; }
                    .detail-item { margin: 10px 0; font-size: 15px; }
                    .detail-label { font-weight: 600; color: #2d3748; }
                    .detail-value { color: #4a5568; }
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
                            <div class=\"tag\">Application Received</div>
                            <div class=\"message-content\">
                                <p>Dear {$toName},</p>
                                <br>
                                <p>Thank you for your application to <strong>{$course_name}</strong> at Teachers' Training Institute of India.</p>
                                <div class=\"application-details\">
                                    <h3>Application Details</h3>
                                    <div class=\"detail-item\">
                                        • <span class=\"detail-label\">Course:</span> 
                                        <span class=\"detail-value\">{$course_name}</span>
                                    </div>
                                    <div class=\"detail-item\">
                                        • <span class=\"detail-label\">Intake:</span> 
                                        <span class=\"detail-value\">{$intake}</span>
                                    </div>
                                    <div class=\"detail-item\">
                                        • <span class=\"detail-label\">Status:</span> 
                                        <span class=\"detail-value\">Under Review</span>
                                    </div>
                                </div>
                                <p>We have received your application and it is currently under review. We will contact you soon with further details.</p>
                                <p>If you have any questions or need assistance, please feel free to contact us.</p>
                            </div>
                        </div>
                        <div class=\"cta-section\">
                            <a href=\"" . base_url('login/index') . "\" class=\"cta-button\">Login to Portal</a>
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

        send_email_message($toEmail, $toName, $subject, $bodyContent, 'TTII Education');
    }
    

    public function test_cohort_mail()
    {
        $user = $this->users_model->get(['id' => 2])->getRow();
        $cohort_id = 56;
        $this->send_cohort_mail($user, $cohort_id);
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

        // log_message('error', print_r($cohort_data, true));
        
        if (!$cohort_data) {
            log_message('error', "Cohort data not found for cohort_id: {$cohort_id}");
            return false;
        }

        // $instructor_id = $this->instructor_enrol_model->get(['course_id' => $cohort_data['course_id']])->getRow()->instructor_id;

        $instructor_name = $cohort_data['instructor_name'] ?? '-';

        $subject = 'Welcome to Your Cohort for ' . ($cohort_data['subject_name'] ?? 'Unknown Subject');

        $toEmail = $user->user_email;
        $toName = $user->name;

        $bodyContent = "<!DOCTYPE html>
            <html lang=\"en\">
            <head>
                <meta charset=\"UTF-8\">
                <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                <title>Welcome to Your Cohort</title>
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
                    .cohort-details { background: #f8faf9; padding: 25px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #8B5CF6; }
                    .cohort-details h3 { font-size: 18px; font-weight: 600; color: #2d3748; margin-bottom: 15px; }
                    .detail-item { margin: 10px 0; font-size: 15px; }
                    .detail-label { font-weight: 600; color: #2d3748; }
                    .detail-value { color: #4a5568; }
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
                            <img src=\"" . base_url() . "/uploads/system/202509/1758687072_c30707b038aa244a95c9_sm.jpg" . "\" alt=\"TTII Logo\" class=\"logo\">
                        </div>
                    </div>
                    <div class=\"content\">
                        <div class=\"notification-card\">
                            <div class=\"tag\">Welcome to Cohort</div>
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
                                <p>We look forward to your active participation and wish you a successful learning experience!</p>
                            </div>
                        </div>
                        <div class=\"cta-section\">
                            <a href=\"" . base_url('login/index') . "\" class=\"cta-button\">Login URL</a>
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

        send_email_message($toEmail, $toName, $subject, $bodyContent, 'TTII Education');
    }


    public function preview_mail()
    {
        $toName = 'John Doe';
        $toEmail = 'john@example.com';
        $instructor_name = 'Dr. Smith';

        $cohort_data = [
            'subject_name' => 'Mathematics',
            'course_name'  => 'B.Ed',
            'start_date'   => '01 Feb 2026',
            'end_date'     => '30 Apr 2026',
        ];

        $bodyContent = "<!DOCTYPE html>
            <html lang=\"en\">
            <head>
                <meta charset=\"UTF-8\">
                <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                <title>Welcome to Your Cohort</title>
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
                    .cohort-details { background: #f8faf9; padding: 25px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #8B5CF6; }
                    .cohort-details h3 { font-size: 18px; font-weight: 600; color: #2d3748; margin-bottom: 15px; }
                    .detail-item { margin: 10px 0; font-size: 15px; }
                    .detail-label { font-weight: 600; color: #2d3748; }
                    .detail-value { color: #4a5568; }
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
                            <img src=\"" . base_url() . "/uploads/system/202509/1758687072_c30707b038aa244a95c9_sm.jpg" . "\" alt=\"TTII Logo\" class=\"logo\">
                        </div>
                    </div>
                    <div class=\"content\">
                        <div class=\"notification-card\">
                            <div class=\"tag\">Welcome to Cohort</div>
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
                                <p>We look forward to your active participation and wish you a successful learning experience!</p>
                            </div>
                        </div>
                        <div class=\"cta-section\">
                            <a href=\"" . base_url('login/index') . "\" class=\"cta-button\">Login URL</a>
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
        // paste your $bodyContent here
        echo $bodyContent;
    }

    // public function test_ins_mail()
    // {
    //     $this->send_cohort_mail_instructor(56);
    // }
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
        $lms_link = base_url('login/index');

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
                        background: linear-gradient(to right, #8B5CF6, #F59E0B, #8B5CF6);
                    }
                    .header {
                        position: relative;
                        padding: 40px;
                        text-align: center;
                        background: #8B5CF6;
                    }
                    .header::after {
                        content: '';
                        position: absolute;
                        bottom: -20px;
                        left: 0;
                        right: 0;
                        height: 40px;
                        background: #8B5CF6;
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
                        margin-bottom: 40px;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    }
                    .tag {
                        display: inline-block;
                        padding: 6px 12px;
                        background: rgba(139,92,246,0.1);
                        color: #8B5CF6;
                        border-radius: 20px;
                        font-size: 12px;
                        font-weight: 600;
                        margin-bottom: 20px;
                    }
                    .message-content {
                        color: #4a5568;
                        font-size: 16px;
                        line-height: 1.8;
                    }
                    .cohort-details {
                        background: #f8faf9;
                        padding: 25px;
                        border-radius: 12px;
                        margin: 20px 0;
                        border-left: 4px solid #8B5CF6;
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
                    .cta-section {
                        text-align: center;
                        margin: 30px 0;
                    }
                    .cta-button {
                        display: inline-block;
                        padding: 16px 40px;
                        background: #F59E0B;
                        color: white !important;
                        text-decoration: none !important;
                        border-radius: 8px;
                        font-weight: 600;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 6px rgba(245,158,11,0.2);
                    }
                    .cta-button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 12px rgba(245,158,11,0.3);
                    }
                    .info-grid {
                        margin-top: 40px;
                        display: flex;
                        flex-wrap: wrap;
                        gap: 20px;
                    }
                    .info-box {
                        position: relative;
                        background: #f8faf9;
                        padding: 25px;
                        border-radius: 12px;
                        flex: 1 1 calc(50% - 10px);
                        margin-bottom: 10px;
                    }
                    .info-label {
                        font-size: 12px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        color: #8B5CF6;
                        margin-bottom: 10px;
                        font-weight: 600;
                    }
                    .info-content {
                        font-size: 15px;
                        color: #4a5568;
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
                        background: rgba(139,92,246,0.2);
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
                        .info-box {
                            flex: 1 1 100%;
                        }
                    }
                </style>
            </head>
            <body>
                <div class=\"email-container\">
                    <div class=\"top-accent\"></div>
                    <div class=\"header\">
                        <div class=\"logo-wrapper\">
                            <img src=\"" . base_url() . "/uploads/system/202509/1758687072_c30707b038aa244a95c9_sm.jpg" . "\" alt=\"TTII Logo\" class=\"logo\">
                        </div>
                    </div>
                    <div class=\"content\">
                        <div class=\"notification-card\">
                            <div class=\"tag\">New Cohort Created</div>
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
                                <p>If you have any questions or need support, please contact us.</p>
                            </div>
                        </div>
                        <div class=\"cta-section\">
                            <a href=\"{$lms_link}\" class=\"cta-button\">Access LMS</a>
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
                'description' => $this->request->getPost('description'),
                'created_at' =>date('Y-m-d H:i:s')
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

