<?php

namespace App\Controllers\App;
use App\Controllers\App\UserBaseController;
use App\Models\Users_model;
use App\Models\Enrol_model;
use App\Models\Course_model;
use App\Models\Category_model;
use App\Models\Assignment_model;
use App\Models\Assignment_submissions_model;

class Assignment extends UserBaseController
{
    private $users_model;
    private $enrol_model;
    private $course_model;
    private $category_model;
    private $assignment_model;
    
    public function __construct()
    {
        parent::__construct();
        $this->users_model = new Users_model();
        $this->enrol_model = new Enrol_model();
        $this->course_model = new Course_model();
        $this->category_model = new Category_model();
        $this->assignment_model = new Assignment_model();
        $this->assignment_submissions_model = new Assignment_submissions_model();
    }

    public function index()
{
    $user_id = get_user_id();
    if (!$user_id) {
        return redirect()->to(base_url('login/index'));
    }

    // Step 1: Get course IDs for enrolled user
    $course_ids = array_column(
        $this->enrol_model->get(['user_id' => $user_id])->getResultArray(),
        'course_id'
    );

    // Step 2: Get submitted assignment IDs
    $submitted_assignments = array_column(
        $this->assignment_submissions_model->get(['user_id' => $user_id])->getResultArray(),
        'assignment_id'
    );

    // Step 3: Get completed and pending assignments
    $completed = $this->assignment_model->get([
        'course_id' => $course_ids,
        'id' => $submitted_assignments
    ])->getResultArray() ?? [];

    $pending = $this->assignment_model->get([
        'course_id' => $course_ids,
        'id NOT IN' => $submitted_assignments
    ])->getResultArray() ?? [];

    // Step 4: Categorize into current & upcoming
    $today = date('Y-m-d');
    $current = [];
    $upcoming = [];
    $completed =[];

    foreach ($pending as $assignment) {
        $due_date_raw = $assignment['due_date'] ?? '0000-00-00';
        $due_date = date('Y-m-d', strtotime($due_date_raw));

        if ($due_date == $today) {
            $current[] = $assignment;
        } elseif ($due_date > $today) {
            $upcoming[] = $assignment;
        } else {
            $completed[] = $assignment;
        }
    }
                                            
    // Step 5: Pass to view
    $this->data['assignments'] = [
        'current' => $current,
        'upcoming' => $upcoming,
        'completed' => $completed,
    ];
    
    $this->data['page_title'] = 'Assignment';
    $this->data['page_name'] = 'Assignment/index';

    return view('App/index', $this->data);
}

    
    public function details($assignment_id = 0)
    {
        
        if($this->request->getMethod()==='post'){
             $data = [
                'assignment_id' => $assignment_id,
                'course_id' => $this->assignment_model->get(['id' => $assignment_id])->getRow()->course_id ?? 0,
                'user_id' => get_user_id(),
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
                'updated_by' => get_user_id(),
            ];
            
            $image = $this->upload_file('assignment','file');
            if($image && valid_file($image['file'])){
				$data['assignment_files'] = json_encode($image['file']);
			}
			$response = $this->assignment_submissions_model->add($data);
			if($response){
			     session()->setFlashdata('message_success', "Assignment submitted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        
        
        $this->data['assignment'] = $this->assignment_model->get(['id' => $assignment_id])->getRowArray() ?? [];
        // $this->data['courses'] = $this->course_model->get(['category_id' => $category_id])->getResultArray();
        // $this->data['category_data'] = $this-> category_model->get(['id' => $category_id])->getRowArray();
        
        // echo("<pre>"); print_r($this->data);die();
        $this->data['page_title'] = 'Assignment';
        $this->data['page_name'] = 'Assignment/details';
        return view('App/index', $this->data);
    }
    
    
}
