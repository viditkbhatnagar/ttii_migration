<?php
namespace App\Controllers\Admin;
use App\Models\Batch_model;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Subject_model;
use App\Models\Lesson_model;
use App\Models\Lesson_file_model;
use App\Models\Quiz_model;


class Subject extends AppBaseController
{
    private $batch_model;
    private $course_model;
    private $users_model;
    private $subject_model;

    protected $is_syncing = false;


    public function __construct()
    {
        parent::__construct();
        $this->batch_model = new Batch_model();
        $this->course_model = new Course_model();
        $this->lesson_model = new Lesson_model();
        $this->quiz_model = new Quiz_model();
        $this->users_model = new Users_model();
        $this->subject_model = new Subject_model();
        $this->lesson_file_model = new Lesson_file_model();
    }

    public function index(){
        
        $this->data['list_items'] = $this->batch_model->get(['status' => 1])->getResultArray();

        $course = $this->course_model->get()->getResultArray();
        $this->data['course'] = array_column($course, 'title', 'id');
        
        $this->data['page_title'] = 'Batch';
        $this->data['page_name'] = 'Batch/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add($id){
        $this->data['course'] = $this->course_model->get()->getResultArray();
        $this->data['course_id'] = $id;
        echo view('Admin/Subject/ajax_add', $this->data);
    }

    public function add()
    {
        $course = $this->request->getPost('course_id');
        if ($this->request->getMethod() === 'post'){         
            $data = [
                'title' => $this->request->getPost('title'),
                'course_id' => $this->request->getPost('course_id'),
                'free' => ($this->request->getPost('free') == 1) ? 'on' : 'off',
                'description' => $this->request->getPost('description'),       
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            $thumbnail = $this->upload_file('subject','thumbnail');
            if($thumbnail && valid_file($thumbnail['file'])){
                $data['thumbnail'] = $thumbnail['file'];
            }
                
            $sub_id = $this->subject_model->add($data);
            if ($sub_id){
                $this->subject_model->edit(['master_subject_id' => $sub_id], ['id' => $sub_id]);
                session()->setFlashdata('message_success', "Subject Added Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/course/add_details/'.$course));
    }


    public function ajax_edit($id){
        $this->data['course'] = $this->course_model->get()->getResultArray();
        $this->data['edit_data'] = $this->subject_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Subject/ajax_edit', $this->data);
    }

    public function edit($id){
        $course = $this->request->getPost('course_id');
        if ($this->request->getMethod() === 'post'){
            $data = [
                'title' => $this->request->getPost('title'),
                //'course_id' => $this->request->getPost('course_id'),
                'free' => ($this->request->getPost('free') == 1) ? 'on' : 'off',
                'description' => $this->request->getPost('description'), 
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            
            $thumbnail = $this->upload_file('subject','thumbnail');
            if($thumbnail && valid_file($thumbnail['file'])){
                $data['thumbnail'] = $thumbnail['file'];
            }
            // $master_subject_id = $this->subject_model->get(['id' => $id])->getRowArray()['master_subject_id'];
            // $response = $this->subject_model->edit($data, ['master_subject_id' => $master_subject_id]);
            
            $response = $this->subject_model->edit($data, ['id' => $id]);
            
            if ($response){
                session()->setFlashdata('message_success', "Subject Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
            // after updating $subject_id with $data  
            $this->propagate_subject_update($id);

        }
        return redirect()->to(base_url('admin/course/add_details/'.$course));
    }

    public function ajax_view($id){
        $this->data['course'] = $this->course_model->get_array_column([], 'id', 'title');
        $this->data['view_data'] = $this->batch_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Batch/ajax_view', $this->data);
    }

    public function delete($id){
        if ($id > 0){
            $lesson_data = $this->lesson_model->get(['subject_id' => $id])->getNumRows();
            if($lesson_data > 0){
                if ($this->lesson_model->remove(['subject_id' => $id])){
                    $this->subject_model->remove(['id' => $id]);
                    session()->setFlashdata('message_success', "Subject Deleted Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            }else{
                $this->subject_model->remove(['id' => $id]);
                session()->setFlashdata('message_success', "Subject Deleted Successfully!");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/course/index'));
    }
    
    
     public function ajax_sort($id){
        $this->data['subjects'] = $this->subject_model->get(['course_id' => $id],null,['order'=>'asc'])->getResultArray();
        $this->data['course_id'] = $id;
        echo view('Admin/Subject/ajax_sort', $this->data);
    }
    
    
    public function updateOrder()
    {
        // $logger = service('logger');
        $subjectOrder = $this->request->getJSON(true)['subjectOrder'];
        foreach ($subjectOrder as $key => $subject) {
            $data = ['order' => $key + 1];
            $this->subject_model->edit($data, ['id' => $subject]);
            // $logger->error('subject order Error: ' . db_connect()->getLastQuery());


        }
        session()->setFlashdata('message_success', "Order updated Successfully!");
        return json_encode(['data'=> 1]);
    }
    
    public function fetch_subjects()
    {
        $course_id = $this->request->getPost('course_id');
        // log_message('error',print_r($course_id,true));
        $sections = $this->subject_model->get(['course_id' => $course_id])->getResultArray();
        return json_encode($sections);
    }


    public function ajax_duplicate_select($id){
        $this->data['course_id'] = $id;
        // Step 1: Get subjects already in this course
        $selected_subjects = $this->subject_model
            ->get(['course_id' => $id])
            ->getResultArray();

        $selected_master_ids = array_column($selected_subjects, 'master_subject_id');

        // Step 2: Get subjects not in this course (exclude master_subject_id)
        $filters = [];
        if (!empty($selected_master_ids)) {
            $filters['subject.master_subject_id NOT IN (' . implode(',', $selected_master_ids) . ')'] = null;
        }

        $unselected_subjects = $this->subject_model->get_join(
            [
                ['course', 'course.id = subject.course_id','left']
            ],$filters,['subject.id','subject.title','course.title as course_title'],null,null,'master_subject_id')->getResultArray();
            // ->get($filters,null,null,null,'master_subject_id')
            // ->getResultArray();

        log_message('error',print_r($unselected_subjects,true));
        $this->data['subjects'] = $unselected_subjects;
        echo view('Admin/Subject/ajax_duplicate_select', $this->data);
    }
    

    // public function add_duplicate()
    // {
    //     $course_id = $this->request->getPost('course_id');
    //     $subject_id = $this->request->getPost('subject');

    //     if ($this->request->getMethod() === 'post' && !empty($subject_id)) {
    //         // Fetch the subject to duplicate
    //         $subject = $this->subject_model->get(['id' => $subject_id])->getRowArray();
    //         if ($subject) {
    //             // Prepare data for new subject
    //             unset($subject['id']);
    //             unset($subject['created_at']);
    //             unset($subject['updated_at']);
    //             $subject['course_id'] = $course_id;
    //             $subject['master_subject_id'] = $subject_id; // Link to original subject
    //             $subject['created_at'] = date('Y-m-d H:i:s');
    //             $subject['created_by'] = get_user_id();

    //             // Insert new subject
    //             if ($this->subject_model->add($subject)) {
    //                 session()->setFlashdata('message_success', "Subject duplicated successfully!");
    //             } else {
    //                 session()->setFlashdata('message_danger', "Failed to duplicate subject. Please try again.");
    //             }
    //         } else {
    //             session()->setFlashdata('message_danger', "Selected subject not found.");
    //         }
    //     } else {
    //         session()->setFlashdata('message_danger', "Invalid request. Please try again.");
    //     }

    //     return redirect()->to(base_url('admin/course/add_details/' . $course_id));
    // }

    public function add_duplicate()
    {
    $course_id = $this->request->getPost('course_id');
    $subject_id = $this->request->getPost('subject');

    if ($this->request->getMethod() === 'post' && !empty($subject_id)) {
        
        // Fetch original subject
        $subject = $this->subject_model->get(['id' => $subject_id])->getRowArray();

        if ($subject) {
            // Clone subject
            unset($subject['id']);
            unset($subject['created_at']);
            unset($subject['updated_at']);

            $subject['course_id'] = $course_id;
            $subject['master_subject_id'] = $subject_id; // Reference to original
            $subject['created_at'] = date('Y-m-d H:i:s');
            $subject['created_by'] = get_user_id();

            $new_subject_id = $this->subject_model->add($subject);

            if ($new_subject_id) {
                // Fetch lessons under original subject
                $lessons = $this->lesson_model->get(['subject_id' => $subject_id])->getResultArray();

                if (!empty($lessons)) {
                    foreach ($lessons as $lesson) {
                        $old_lesson_id = $lesson['id'];

                        // Clone lesson
                        unset($lesson['id']);
                        unset($lesson['created_at']);
                        unset($lesson['updated_at']);

                        $lesson['subject_id'] = $new_subject_id;
                        $lesson['course_id'] = $course_id;
                        $lesson['master_lesson_id'] = $old_lesson_id; // Reference to original
                        $lesson['created_at'] = date('Y-m-d H:i:s');
                        $lesson['created_by'] = get_user_id();

                        $new_lesson_id = $this->lesson_model->add($lesson);

                        if ($new_lesson_id) {
                            // Fetch lesson files under original lesson
                            $lesson_files = $this->lesson_file_model->get(['lesson_id' => $old_lesson_id])->getResultArray();

                            if (!empty($lesson_files)) {
                                foreach ($lesson_files as $file) {
                                    $old_file_id = $file['id'];

                                    unset($file['id']);
                                    unset($file['created_at']);
                                    unset($file['updated_at']);

                                    $file['lesson_id'] = $new_lesson_id;
                                    $file['master_lesson_file_id'] = $old_file_id; // Reference to original
                                    $file['created_at'] = date('Y-m-d H:i:s');
                                    $file['created_by'] = get_user_id();

                                    $new_file_id = $this->lesson_file_model->add($file);

                                    //  Clone quiz questions under this lesson file
                                    if ($new_file_id) {
                                        $quiz_questions = $this->quiz_model->get(['lesson_file_id' => $old_file_id])->getResultArray();

                                        if (!empty($quiz_questions)) {
                                            foreach ($quiz_questions as $quiz) {
                                                $quiz['master_quiz_id'] = $quiz['id'] ?? null; // optional reference
                                                unset($quiz['id'], $quiz['created_at'], $quiz['updated_at']);
                                                $quiz['lesson_file_id'] = $new_file_id;
                                                $quiz['created_at'] = date('Y-m-d H:i:s');
                                                $quiz['created_by'] = get_user_id();
                                                
                                                $this->quiz_model->add($quiz);
                                            }
                                        }
                                    }

                                }
                            }
                        }
                    }
                }

                session()->setFlashdata('message_success', "Subject duplicated successfully with lessons and files!");
            } else {
                session()->setFlashdata('message_danger', "Failed to duplicate subject.");
            }
        } else {
            session()->setFlashdata('message_danger', "Selected subject not found.");
        }
    } else {
        session()->setFlashdata('message_danger', "Invalid request. Please try again.");
    }

    return redirect()->to(base_url('admin/course/add_details/' . $course_id));
    }



    protected function propagate_subject_update(int $subject_id, array $updated_fields = [])
    {
        // avoid recursive sync
        if ($this->is_syncing) return;
        $this->is_syncing = true;

        log_message('error','propagate_subject_update: ' . $subject_id);
        // load the subject (fresh)
        $orig = $this->subject_model->get(['id' => $subject_id])->getRowArray();
        if (!$orig) { $this->is_syncing = false; return; }

        // Determine group master id (if master_subject_id is set, that is the group id, otherwise this record is a master)
        $group_master_id = $orig['master_subject_id'] ?: $orig['id'];

        // get all subject copies in group except the one that triggered
        $clones = $this->subject_model
            ->get(['master_subject_id' => $group_master_id])
            ->getResultArray();

        // Also include the master if master id != subject_id and original changed should update master too
        if ($group_master_id !== $subject_id && $group_master_id != $orig['id']) {
            $master_subject = $this->subject_model->get(['id' => $group_master_id])->getRowArray();
            if ($master_subject) $clones[] = $master_subject;
        }

        // fields to sync: if provided use that subset, else use everything except pk/created_at
        if (empty($updated_fields)) {
        $updated_fields = $orig;
        unset(
            $updated_fields['id'],
            $updated_fields['created_at'],
            $updated_fields['order'],       //  don't overwrite the order
            $updated_fields['free'], 
            $updated_fields['course_id'],   //  don't overwrite the course
            $updated_fields['created_by'],
            $updated_fields['master_subject_id'] //  keep clone linkage
        );
    }

        foreach ($clones as $c) {
            if ($c['id'] == $subject_id) continue;
            // Do not overwrite created_by/created_at unless you want to; keep updated_at
            $to_update = $updated_fields;
            $to_update['updated_at'] = date('Y-m-d H:i:s');

            // Use model update - your base model's update signature may vary
            $this->subject_model->edit($to_update,['id' => $c['id']]);
            log_message('error','propagate_subject_update: ' . $subject_id . ' -> ' . $c['id']);
        }

        $this->is_syncing = false;
    }

}
