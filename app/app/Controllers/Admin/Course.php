<?php
namespace App\Controllers\Admin;
use App\Models\Course_model;
use App\Models\Category_model;
use App\Models\Subject_model;
use App\Models\Lesson_model;
use App\Models\Topic_model;

use App\Models\Lesson_file_model;
use App\Models\Enrol_model;
use App\Models\Users_model;
use App\Models\Batch_model;
use App\Models\Batch_students_model;
use App\Models\Instructor_enrol_model;

class Course extends AppBaseController
{
    private $course_model;
    private $category_model;
    private $subject_model;
    private $lesson_model;
    private $topic_model;
    private $lesson_file_model;
    private $enrol_model;
    private $users_model;
    private $batch_model;
    private $batch_students_model;
    private $instructor_enrol_model;

    public function __construct()
    {
        parent::__construct();
        $this->course_model = new Course_model();
        $this->category_model = new Category_model();
        $this->subject_model = new Subject_model();
        $this->lesson_model = new Lesson_model();
        $this->topic_model = new Topic_model();
        $this->lesson_file_model = new Lesson_file_model();
        $this->enrol_model = new Enrol_model();
        $this->users_model = new Users_model();
        $this->batch_model = new Batch_model();
        $this->batch_students_model = new Batch_students_model();
        $this->instructor_enrol_model = new Instructor_enrol_model();

    }

    public function index(){
        
        $filter_where = [];
            
        if(!empty($this->request->getGet('status'))){
            $filter_where['status'] = $this->request->getGet('status');
        } 
        
        // if($this->request->getGet('price')!=NULL){
            
        //     if($this->request->getGet('price') == 'free')
        //     {
        //         $filter_where['is_free_course'] = null;
        //     }
        //     elseif($this->request->getGet('price') == 'paid')
        //     {
        //         $filter_where['is_free_course'] = '1';
        //     }
        // } 
        
        // if($this->request->getGet('status')!=NULL){
            
        //     if($this->request->getGet('status') == 'active')
        //     {
        //         $filter_where['is_free_course'] = 'active';
        //     }
        //     elseif($this->request->getGet('status') == 'pending')
        //     {
        //         $filter_where['is_free_course'] = 'pending';
        //     }
        // } 
        
        
        
        $logger = service('logger');
        
        $role_id = get_role_id();
        $user_id = get_user_id();
            
        if($role_id == 3){
            
            $user_id = get_user_id();
            $course_data = $this->instructor_enrol_model->get(['instructor_id' => $user_id])->getResultArray();
            $course_ids = [];
            foreach ($course_data as $course) {
                $course_ids[] = $course['course_id'];
            }
            
            $course_id = $course_ids;
            
            $course = $this->course_model->get(['id' => $course_id])->getResultArray();
        }else{
            $course = $this->course_model->get($filter_where,null,['id','desc'])->getResultArray();
        }
        
        // $course = $this->course_model->get($filter_where,null,['id','desc'])->getResultArray();
        // $logger->error('Database Error: ' . db_connect()->getLastQuery());
       
        if(!empty($course))
        {
            foreach($course as $k => $val)
            {
                $course[$k]['section'] = $this->subject_model->get(['course_id'=> $val['id']])->getNumRows();
                $course[$k]['lesson'] = $this->lesson_model->get(['course_id'=> $val['id']])->getNumRows();
                $course[$k]['enrolled'] = $this->enrol_model->get_join(
                    [
                        ['course', 'course.id = enrol.course_id','left'],
                        ['users', 'users.id = enrol.user_id','left'],
                    ],['enrol.course_id'=> $val['id']],[' users.id','users.name','users.email','users.country_code','users.phone','enrol.created_at','course.title as course_name']
                )->getNumRows();
            }
        }
        $this->data['list_items'] = $course;
        
        // log_message('error','course : ' .print_r($this->data['list_items'],true));
        
        
        $category = $this->category_model->get()->getResultArray();
        $this->data['category'] = array_column($category, 'name', 'id');
        
        $this->data['categorys'] = $this->category_model->get(['parent'=>0])->getResultArray();
        $this->data['instructor'] =  $this->users_model->get(['role_id'=>3])->getResultArray();
        $this->data['total_active'] = $this->course_model->get(['status' => 'active'])->getNumRows();
        $this->data['total_pending'] = $this->course_model->get(['status' => 'pending'])->getNumRows();
        $this->data['total_free']   = $this->course_model->get(['is_free_course' => null])->getNumRows();
        $this->data['total_paid'] = $this->course_model->get(['is_free_course' => 'paid'])->getNumRows();
        
        $this->data['page_title'] = 'Course';
        $this->data['page_name'] = 'Course/index';
        return view('Admin/index', $this->data);
    }
    

    public function ajax_add(){
        
        $this->data['category'] = $this->category_model->get(['parent'=>0])->getResultArray();
        $this->data['instructor'] =  $this->users_model->get(['role_id'=>3])->getResultArray();

        echo view('Admin/Course/ajax_add', $this->data);
    }
    
    
    public function add($id=null)
    {
        // Check if the form is submitted
        if ($this->request->getMethod() === 'post') 
        {
            $title = $this->request->getPost('title');
            $short_name = $this->request->getPost('short_name');
            $description = $this->request->getPost('description');
            $duration = $this->request->getPost('duration');
            $category_id = $this->request->getPost('category_id');
            $is_free_course = ($this->request->getPost('is_free_course') == '0') ? 0 : 1; // Adjust to handle the radio button properly
            $is_cohort_course = ($this->request->getPost('is_cohort_course') == '0') ? 0 : 1; // Adjust to handle the radio button properly
            $is_public = ($this->request->getPost('is_public') == '0') ? 0 : 1; // Adjust to handle the radio button properly
            $price = $this->request->getPost('price');
            $point = $this->request->getPost('point');
            $sale_price = $this->request->getPost('sale_price');
            $featuresRaw = $this->request->getPost('features'); // Get textarea content
            // Split by new lines into array
            $featuresArray = preg_split("/\r\n|\r|\n/", trim($featuresRaw));

            // Remove empty lines
            $featuresArray = array_filter($featuresArray);

            
            if($is_free_course == 1)
            {
                $price = 0;
                $sale_price = 0;
            }
        
            // Insert the course data into the database
            $courseData = [
                'title' => $title,
                'short_name' => $short_name,
                'category_id' => $category_id,
                'description' => $description,
                'duration' => $duration,
                'features' => json_encode(array_values($featuresArray)),
                'is_free_course' => $is_free_course,
                'is_cohort_course' => $is_cohort_course,
                'is_public' => $is_public,
                'price' => $price,
                'sale_price' => $sale_price,
                'total_amount' => $sale_price,
                'status' => 'draft',
                'point' => $point,
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => get_user_id()
            ];
            
            if(!empty($_FILES['thumbnail']))
            {
                // Handle file upload for thumbnail
                $thumbnail = $this->upload_file('course', 'thumbnail');
                if ($thumbnail && valid_file($thumbnail['file'])) {
                    $courseData['thumbnail'] = $thumbnail['file'];
                }
            }
                
            // if(!empty($_FILES['banner']))
            // {
            //     // Handle file upload for banner
            //     $banner = $this->upload_file('course', 'banner');
            //     if ($banner && valid_file($banner['file'])) {
            //         $courseData['banner'] = $banner['file'];
            //     }
            // }
                
            // Save course data and get the course_id
            $courseId = $this->course_model->add($courseData);
            return redirect()->to(base_url('admin/course/add_details/'.$courseId));

        }
        
        if(!empty($id))
        {
            $this->data['edit_data'] = $this->course_model->get(['id' => $id])->getRowArray();
            if (!empty($this->data['edit_data']['features'])) {
                $featuresArray = json_decode($this->data['edit_data']['features'], true);
                if (is_array($featuresArray)) {
                    $featuresRaw = implode("\n", $featuresArray);
                    $this->data['edit_data']['features'] = $featuresRaw; // Convert back to raw text for the form
                } else {
                    $this->data['edit_data']['features'] = '';
                }
            } else {
                $this->data['edit_data']['features'] = '';
            }

            $this->data['course_id'] = $id;
        }
        else
        {
            $this->data['course_id'] = '';
            $this->data['edit_data'] = [];
        }
    
        // Prepare data for view
        $this->data['page_title'] = 'Add Course';
        $this->data['page_name'] = 'Course/add';
    
        return view('Admin/index', $this->data);
    }
    
    public function edit($id)
    {
        if ($this->request->getMethod() === 'post')
        {
            $title = $this->request->getPost('title');
            $description = $this->request->getPost('description');
            $short_name = $this->request->getPost('short_name');
            $duration = $this->request->getPost('duration');
            $category_id = $this->request->getPost('category_id');
            $is_free_course = ($this->request->getPost('is_free_course') == '0') ? 0 : 1; // Adjust to handle the radio button properly
            $is_cohort_course = ($this->request->getPost('is_cohort_course') == '0') ? 0 : 1; // Adjust to handle the radio button properly
            $is_public = ($this->request->getPost('is_public') == '0') ? 0 : 1; // Adjust to handle the radio button properly
            $price = $this->request->getPost('price');
            $sale_price = $this->request->getPost('sale_price');
            $featuresRaw = $this->request->getPost('features'); // Get textarea content
            $point = $this->request->getPost('point');
            // Split by new lines into array
            $featuresArray = preg_split("/\r\n|\r|\n/", trim($featuresRaw));

            // Remove empty lines
            $featuresArray = array_filter($featuresArray);
            
             if($is_free_course == 1)
            {
                $price = 0;
                $sale_price = 0;
            }
        
            // Insert the course data into the database
            $courseData = [
                'title' => $title,
                'description' => $description,
                'short_name' => $short_name,
                'duration' => $duration,
                'features' => json_encode(array_values($featuresArray)),
                'category_id' => $category_id,
                'is_free_course' => $is_free_course,
                'is_cohort_course' => $is_cohort_course,
                'is_public' => $is_public,
                'price' => $price,
                'sale_price' => $sale_price,
                'total_amount' => $sale_price,
                'point' => $point,
                'updated_at' => date('Y-m-d H:i:s'),
                'updated_by' => get_user_id(),

            ];
            
            if(!empty($_FILES['thumbnail']))
            {
                // Handle file upload for thumbnail
                $thumbnail = $this->upload_file('course', 'thumbnail');
                if ($thumbnail && valid_file($thumbnail['file'])) {
                    $courseData['thumbnail'] = $thumbnail['file'];
                }
            }
            
          
            
            $response = $this->course_model->edit($courseData, ['id' => $id]);
            if ($response)
            {
                return redirect()->to(base_url('admin/course/add_details/'.$id));

                session()->setFlashdata('message_success', "Course Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/course/index'));
    }
    
    
    public function add_details($id)
    {
        // Check if the form is submitted
        if ($this->request->getMethod() === 'post') 
        {
            $title = $this->request->getPost('title');
            $description = $this->request->getPost('description');
            $is_free_course = ($this->request->getPost('is_free_course') == 'paid') ? 0 : 1; // Adjust to handle the radio button properly
            $price = $this->request->getPost('price');
            $sale_price = $this->request->getPost('sale_price');
        
            // Insert the course data into the database
            $courseData = [
                'title' => $title,
                'description' => $description,
                'is_free_course' => $is_free_course,
                'price' => $price,
                'sale_price' => $sale_price
            ];
            
            // Handle file upload for thumbnail
            $thumbnail = $this->upload_file('course', 'thumbnail');
            if ($thumbnail && valid_file($thumbnail['file'])) {
                $courseData['thumbnail'] = $thumbnail['file'];
            }
            
            // Save course data and get the course_id
            $courseId = $this->course_model->add($courseData);
        }
        else
        {
            $this->data['edit_data'] = [];
            $this->data['form_submitted'] = false;
        }
        
        // Get subjects of the course
        $this->data['subjects'] = $this->subject_model
            ->get(['course_id' => $id])
            ->getResultArray();

        // Attach lessons to each subject
        foreach ($this->data['subjects'] as &$subject) {
            // updated by ADEEB to use subject['id'] instead of master_subject_id
            $subject['lessons'] = $this->lesson_model
                ->get(
                    // ['subject_id' => $subject['master_subject_id']], // ADEEB
                    ['subject_id' => $subject['id']], // Fix: Use subject['id'] instead of master_subject_id
                    null,
                    ['order'=> 'asc']
                )
                ->getResultArray();
        }
        unset($subject); // break reference

        
        // $this->data['topics'] = $this->topic_model->get(['course_id'=>$id],null,['order','asc'])->getResultArray();

    
        // Prepare data for view
        $this->data['course_id'] = $id;
        $this->data['course_title'] = $this->course_model->get(['id' => $id])->getRowArray()['title'];
        $this->data['page_title'] = 'Add Course';
        $this->data['page_name'] = 'Course/add_details';
    
        return view('Admin/index', $this->data);
    }


//     public function add()
//     {
//         if ($this->request->getMethod() === 'post'){
//             $discounted_price = $this->request->getPost('discounted_price');
//             $discount_flag = $discounted_price != 0 ? 1 : 0; 
//             $data = [
                
//                 'title' => $this->request->getPost('title'),
//                 'description' => $this->request->getPost('description'),
//                     'price' => $this->request->getPost('price'),
//                 'duration' => $this->request->getPost('duration'),
//                 'instructor_id' => $this->request->getPost('instructor_id'),

                
//                 'status' => 'Active',
//                 'features'=> $this->request->getPost('features'),
//                 'is_free_course' => ($this->request->getPost('is_free_course') == 1) ? 1 : 0,
//                 'is_featured' => ($this->request->getPost('is_featured') == 1) ? 1 : 0,
//                 'discounted_price' => $discounted_price,
//                 'discount_flag' => $discount_flag,
//                 'created_by' => get_user_id(),
//                 'created_at' => date('Y-m-d H:i:s'),
            
//             ];
           
           
        			
//         	$thumbnail = $this->upload_file('course','thumbnail');
//             if($thumbnail && valid_file($thumbnail['file'])){
// 				$data['thumbnail'] = $thumbnail['file'];
// 			}
            
//             $course_id = $this->course_model->add($data);
           
//             if ($course_id)
//             {
                
//                 session()->setFlashdata('message_success', "Course Added Successfully!");
                
//             }
//             else
//             {
//                 session()->setFlashdata('message_danger', "Something went wrong! Try Again");
//             }
//         }
//         return redirect()->to(base_url('admin/course/index'));
//     }

    public function ajax_edit($id){
        $this->data['category'] = $this->category_model->get(['parent'=>0])->getResultArray();
                $this->data['instructor'] =  $this->users_model->get(['role_id'=>3])->getResultArray();

        $this->data['edit_data'] = $this->course_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Course/ajax_edit', $this->data);
    }
    
//     public function edit($id)
//     {
//         if ($this->request->getMethod() === 'post'){
//             $discount_price = $this->request->getPost('discounted_price');
//             $discount_flag = $discount_price != 0 ? 1 : 0; 
//             $data = [
                
//                 'title' => $this->request->getPost('title'),
//                 'description' => $this->request->getPost('description'),
                
//                  'price' => $this->request->getPost('price'),


//                 'duration' => $this->request->getPost('duration'),

//                 'instructor_id' => $this->request->getPost('instructor_id'),


                
//                 'status' => 'Active',
//                 'is_free_course' => ($this->request->getPost('is_free_course') == 1) ? 1 : 0,
//                 'is_featured' => ($this->request->getPost('is_featured') == 1) ? 1 : 0,
//                 'features'=> $this->request->getPost('features'),
//                 'discounted_price' => $discount_price,
//                 'discount_flag' => $discount_flag,

     
//                 'updated_by' => get_user_id(),
//                 'updated_at' => date('Y-m-d H:i:s'),
//             ];
            
          
          
        			
//         	$thumbnail = $this->upload_file('course','thumbnail');
//             if($thumbnail && valid_file($thumbnail['file'])){
// 				$data['thumbnail'] = $thumbnail['file'];
// 			}
            
//             $response = $this->course_model->edit($data, ['id' => $id]);
//             if ($response){
//                 session()->setFlashdata('message_success', "Course Updated Successfully!");
//             }else{
//                 session()->setFlashdata('message_danger', "Something went wrong! Try Again");
//             }
//         }
//         return redirect()->to(base_url('admin/course/index'));
//     }

    public function ajax_view($id){
        $this->data['view_data'] = $this->course_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Course/ajax_view', $this->data);
    }

    // public function delete($id){
    //     if ($id > 0){
    //         if ($this->course_model->remove(['id' => $id])){
    //             session()->setFlashdata('message_success', "Course Deleted Successfully!");
    //         }else{
    //             session()->setFlashdata('message_danger', "Something went wrong! Try Again");
    //         }
    //     }else{
    //         session()->setFlashdata('message_danger', "Something went wrong! Try Again");
    //     }
    //     return redirect()->to(base_url('admin/course/index'));
    // }
    
    public function delete($id){
        if ($id > 0){
            $subjects = $this->subject_model->get(['course_id'=>$id],null)->getResultArray();
            foreach ($subjects as $subject) {
                $lessons = $this->lesson_model->get(['subject_id'=>$subject['id']],null)->getResultArray();
                foreach ($lessons as $lesson) {
                    $files = $this->lesson_file_model->get(['lesson_id' => $lesson['id']])->getResultArray();
                    foreach ($files as $file) {
                        $this->lesson_file_model->remove(['id' => $file['id']]);
                    }
                    $this->lesson_model->remove(['id' => $lesson['id']]);
                }
                $this->subject_model->remove(['id' => $subject['id']]);
            }
            $enrolled = $this->enrol_model->get(['course_id'=>$id],null)->getResultArray();
            foreach($enrolled as $enroll){
                $this->enrol_model->remove(['course_id' => $id]);
            }
            if ($this->course_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Course Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/course/index'));
    }
    
    public function details($id)
    {
        $this->data['category'] = $this->category_model->get(['parent'=>0])->getResultArray();
        $logger = service('logger');

        $this->data['subjects'] = $this->subject_model->get(['course_id'=>$id],null,['order'=>'asc'])->getResultArray();
        

        $this->data['lessons'] = $this->lesson_model->get(['course_id'=>$id],null,['order','asc'])->getResultArray();
        $this->data['edit_data'] = $this->course_model->get(['id' => $id])->getRowArray();
        $this->data['course_id'] = $id;
         
        $this->data['page_title'] = 'Course Details';
        $this->data['page_name'] = 'Course/details';
        return view('Admin/index', $this->data);
    }
    
    public function enrolled_students($id)
    {
        $this->data['list_items'] = $this->enrol_model->get_join(
            [
                ['users', 'users.id = enrol.user_id'],
            ],['enrol.course_id' => $id],[' users.id','users.name','users.email','users.country_code','users.phone','enrol.created_at']
        )->getResultArray();
        // echo '<pre>';
        // print_r(db_connect()->getLastQuery());die();
                
        $this->data['course_id'] =  $id;
        $this->data['page_title'] = 'Enrolled Students';
        $this->data['page_name'] = 'Course/students';
        return view('Admin/index', $this->data);
    }
    
    
    public function change_status($id)
    {
        $status = $this->request->getGet('status');
        
        $data = [
            'status' => $status,
            'updated_by' => get_user_id(),
            'updated_at' => date('Y-m-d H:i:s'),
        ];
        
        $response = $this->course_model->edit($data, ['id' => $id]);
        if ($response){
            session()->setFlashdata('message_success', "Status changed successfully!");
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        
        return redirect()->to(base_url('admin/course/index'));
    }
    
    
    
    public function ajax_add_subject($id){
        $this->data['course_id'] = $id;
        echo view('Admin/Course/ajax_add_subject', $this->data);
    }
    
    public function ajax_add_lesson($id){
         $this->data['subjects'] = $this->subject_model->get(['course_id'=>$id])->getResultArray();
        $this->data['course_id'] = $id;
        echo view('Admin/Course/ajax_add_lesson', $this->data);
    }
    
    public function add_lesson(){
        $course = $this->request->getPost('course_id');
        if ($this->request->getMethod() === 'post'){
            
         
                $data = [
                    'title' => $this->request->getPost('title'),
                    'course_id' => $this->request->getPost('course_id'),
                    'subject_id' => $this->request->getPost('subject_id'),
                    'summary' => $this->request->getPost('summary'),
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
                
                
    			
                $cat_id = $this->lesson_model->add($data);
                if ($cat_id){
                    session()->setFlashdata('message_success', "Lesson Added Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
           
        }
        return redirect()->to(base_url('admin/course/add_details/'.$course));
    }
    
    public function batch($id){
        
        $this->data['list_items'] = $this->batch_model->get(['course_id'=>$id],null,['id'=>'desc'])->getResultArray();

        $this->data['page_title'] = 'Intake';
        $this->data['page_name'] = 'Course/batch';
        return view('Admin/index', $this->data);
    }
    
    //  public function faq($id){
        
    //     $this->data['list_items'] = $this->faq_model->get(['course_id'=>$id],null,['id'=>'desc'])->getResultArray();
    //     $this->data['course_id'] = $id;
    //     $this->data['page_title'] = 'FAQ';
    //     $this->data['page_name'] = 'Course/faq';
    //     return view('Admin/index', $this->data);
    // }
    
     public function ajax_add_faq($id){
        $this->data['course_id'] = $id;
        echo view('Admin/Course/ajax_add_faq', $this->data);
    }
    
    
    
    public function students($id){
        
        $this->data['list_items'] = $this->batch_students_model->get_join(
                                    [
                                        ['users', 'users.id = batch_students.user_id'],
                                    ],['batch_students.batch_id' => $id,'users.role_id' => 2],['batch_students.id','users.name','users.phone']
                                    )->getResultArray();
                    

        $course = $this->course_model->get()->getResultArray();
        $this->data['course'] = array_column($course, 'title', 'id');
        $this->data['batch_id'] = $id;
        $this->data['page_title'] = 'Batch Students';
        $this->data['page_name'] = 'Course/students';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add_sudent($batch){

        $course =  $this->batch_model->get(['id' => $batch])->getRowArray();
        
        $course_id = $course['course_id'];
        
        $allstudents =  $this->enrol_model->get_join(
                                    [
                                        ['users', 'users.id = enrol.user_id'],
                                    ],['enrol.course_id' => $course_id,'users.role_id' => 2],['users.id','users.name','users.phone']
                                    )->getResultArray();
                                    
                                    
        $existing = $this->batch_students_model->get_join(
                                    [
                                        ['users', 'users.id = batch_students.user_id'],
                                    ],['batch_students.batch_id' => $batch,'users.role_id' => 2],['users.id','users.name','users.phone']
                                    )->getResultArray();
                                    
        // Extract user IDs of existing students
        $existingIds = array_column($existing, 'id');
        
        // Filter students who are not already assigned to the batch
        $this->data['students'] = array_filter($allstudents, function($student) use ($existingIds) {
            return !in_array($student['id'], $existingIds);
        });

                                    

                                    
        $this->data['batch_id'] = $batch;
                                    
    
        echo view('Admin/Course/ajax_add_sudent', $this->data);
    }
    
    
    public function add_student_to_batch()
    {
        $batch_id = $this->request->getPost('batch_id');
        if ($this->request->getMethod() === 'post'){
            
         
                $data = [
                    'batch_id' => $this->request->getPost('batch_id'),
                    'user_id' => $this->request->getPost('user_id'),

                    'created_by' => get_user_id(),
                    'updated_by' => get_user_id(),

                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
                
                
    			
                $cat_id = $this->batch_students_model->add($data);
                if ($cat_id){
                    session()->setFlashdata('message_success', "Lesson Added Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
           
        }
        return redirect()->to(base_url('admin/course/students/'.$batch_id));
    }
    
    
    public function delete_from_batch($id){
        if ($id > 0){
            
            $batch =  $this->batch_students_model->get(['id' => $id])->getRowArray();
            $batch_id = $batch['batch_id'];
            
            if ($this->batch_students_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Course Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/course/students/'.$batch_id));
    }
    
    public function delete_from_enrol($user_id, $course_id){
        if ($user_id > 0){
            
            if ($this->enrol_model->remove(['user_id' => $user_id, 'course_id' => $course_id])){
                session()->setFlashdata('message_success', "Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/course/enrolled_students/'.$course_id));
    }
    
    
    public function get_course_by_category()
    {
        $category_id = $this->request->getPost('category_id');
        $courses = $this->course_model->get(['category_id' => $category_id])->getResultArray();
    
        $options = '<select><option value="">Choose Course</option>';
    
        if (!empty($courses)) {
            foreach ($courses as $course) {
                $selected = ($course['id'] == $this->request->getPost('selected_course_id')) ? 'selected' : '';
                $options .= '<option value="' . $course['id'] . '" ' . $selected . '>' . $course['title'] . '</option>';
            }
        }
    
        $options .= '</select>';
        echo $options;
    }
    
    
    public function get_electives()
    {
        $course_id = $this->request->getPost('course_id');
        $subjects = $this->subject_model->get(['course_id' => $course_id,'subject_type' => 2])->getResultArray();
        
        if (!empty($subjects)) {
            $options = '';
            foreach ($subjects as $sub) {
                $selected = ($sub['id'] == $this->request->getPost('selected_subject_id')) ? 'selected' : '';
                $options .= '<option value="' . $sub['id'] . '" ' . $selected . '>' . $sub['title'] . '</option>';
            }
        } else {
            $options = ''; // If no subjects, return empty string
        }
        
        echo $options;  // Return the options only
    }

    
}
