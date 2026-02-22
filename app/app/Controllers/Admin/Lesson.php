<?php
namespace App\Controllers\Admin;
use App\Models\Batch_model;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Subject_model;
use App\Models\Lesson_model;
use App\Models\Lesson_file_model;


class Lesson extends AppBaseController
{
    private $batch_model;
    private $course_model;
    private $users_model;
    private $subject_model;
    private $lesson_model;
    private $lesson_file_model;

    protected $is_syncing = false;

    public function __construct()
    {
        parent::__construct();
        $this->batch_model = new Batch_model();
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->subject_model = new Subject_model();
        $this->lesson_model = new Lesson_model();
        $this->lesson_file_model = new Lesson_file_model();
    }

  
    public function ajax_add($course,$subject)
    {
        $this->data['subjects'] = $this->subject_model->get(['course_id'=>$course])->getResultArray();
        $this->data['course_id'] = $course;
        $this->data['subject_id'] = $subject;

        echo view('Admin/Lesson/ajax_add', $this->data);
    }

    public function add()
    {
        $course = $this->request->getPost('course_id');
        if ($this->request->getMethod() === 'post'){
         
                $data = [
                    'title' => $this->request->getPost('title'),
                    'course_id' => $this->request->getPost('course_id'),
                    'subject_id' => $this->request->getPost('subject_id'),
                    // 'order' => $this->request->getPost('order'),
                    'summary' => $this->request->getPost('summary'),
                    'free' => ($this->request->getPost('free') == 1) ? 'on' : 'off',
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
                
                  $thumbnail = $this->upload_file('lesson','thumbnail');
                    if($thumbnail && valid_file($thumbnail['file'])){
        				$data['thumbnail'] = $thumbnail['file'];
        			}
    			
                $cat_id = $this->lesson_model->add($data);
                if ($cat_id){
                    $this->lesson_model->edit(['master_lesson_id' => $cat_id], ['id' => $cat_id]);
                    $this->propagate_new_child_addition('lesson', $cat_id);
                    session()->setFlashdata('message_success', "Lesson Added Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
           
        }
        // return redirect()->to(base_url('admin/course/add_details/'.$course));
        return redirect()->to($_SERVER['HTTP_REFERER']);
    }



    public function ajax_edit($id){
        $this->data['subjects'] = $this->subject_model->get()->getResultArray();
        $this->data['edit_data'] = $this->lesson_model->get(['id' => $id])->getRowArray();
       
        echo view('Admin/Lesson/ajax_edit', $this->data);
    }

    public function edit($id){
        $course = $this->request->getPost('course_id');

        
        if ($this->request->getMethod() === 'post'){
            $data = [
                  'title' => $this->request->getPost('title'),
                    'course_id' => $this->request->getPost('course_id'),
                    'subject_id' => $this->request->getPost('subject_id'),
                    // 'order' => $this->request->getPost('order'),
                    'summary' => $this->request->getPost('summary'),
                                        'free' => ($this->request->getPost('free') == 1) ? 'on' : 'off',


                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
              $thumbnail = $this->upload_file('lesson','thumbnail');

                    if($thumbnail && valid_file($thumbnail['file'])){
        				$data['thumbnail'] = $thumbnail['file'];
        			}
            
            $response = $this->lesson_model->edit($data, ['id' => $id]);
            if ($response){
                session()->setFlashdata('message_success', "Lesson Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }

            $this->propagate_lesson_update($id);
        }
        // return redirect()->to(base_url('admin/course/details/'.$course));
         return redirect()->to($_SERVER['HTTP_REFERER']);
    }

    public function ajax_view($id){
        $this->data['course'] = $this->course_model->get_array_column([], 'id', 'title');
        $this->data['view_data'] = $this->batch_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Batch/ajax_view', $this->data);
    }

    // public function delete($id){
    //     if ($id > 0){
    //         $lesson_file_data = $this->lesson_file_model->get(['lesson_id' => $id])->getNumRows();
    //         if($lesson_file_data > 0){
    //             if ($this->lesson_file_model->remove(['lesson_id' => $id])){
    //                 $this->lesson_model->remove(['id' => $id]);
    //                 session()->setFlashdata('message_success', "Lesson Deleted Successfully!");
    //             }else{
    //                 session()->setFlashdata('message_danger', "Something went wrong! Try Again");
    //             }
    //         }else{
    //             $this->lesson_model->remove(['id' => $id]);
    //             session()->setFlashdata('message_success', "Lesson Deleted Successfully!");
    //         }
    //     }else{
    //         session()->setFlashdata('message_danger', "Something went wrong! Try Again");
    //     }
    //     // return redirect()->to(base_url('admin/course/index'));
    //      return redirect()->to($_SERVER['HTTP_REFERER']);
    // }


    public function delete($id)
    {
        if ($id > 0) {
            // Handle two-way sync deletion
            $this->deleteLessonGroup($id);

            session()->setFlashdata('message_success', "Lesson Deleted Successfully!");
        } else {
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }

        return redirect()->to($_SERVER['HTTP_REFERER']);
    }



    private function deleteLessonGroup($lesson_id)
    {
        // Fetch original lesson
        $orig = $this->lesson_model->get(['id' => $lesson_id])->getRowArray();
        if (!$orig) return;

        // Determine the master group id
        $group_master_id = $orig['master_lesson_id'] ?? $orig['id'];

        // Get all related lessons (both master + clones)
        $group_lessons = $this->lesson_model
            ->get([
                'OR' => [
                    'master_lesson_id' => $group_master_id,
                    'id' => $group_master_id
                ]
            ])
            ->getResultArray();

        // Loop and delete each lesson + its files
        foreach ($group_lessons as $lesson) {
            // Delete lesson files under this lesson
            $this->lesson_file_model->remove(['lesson_id' => $lesson['id']]);

            // Delete lesson itself
            $this->lesson_model->remove(['id' => $lesson['id']]);
        }
    }

    
    //  public function ajax_sort($id){

    //     $this->data['lessons'] = $this->lesson_model->get(['course_id' => $id],null,['order'=>'asc'])->getResultArray();
    //     $this->data['course_id'] =$id;
        
    //     // $course =  $this->subject_model->get(['id' => $id])->getRowArray();
        
    //     // $this->data['course_id'] = $course['course_id'];
        
    //     echo view('Admin/Lesson/ajax_sort', $this->data);
    // }
    
    public function ajax_sort($id){

        $this->data['lessons'] = $this->lesson_model->get(['subject_id' => $id],null,['order'=>'asc'])->getResultArray();
        $this->data['course_id'] =$id;

        // $course =  $this->subject_model->get(['id' => $id])->getRowArray();

        // $this->data['course_id'] = $course['course_id'];

        echo view('Admin/Lesson/ajax_sort', $this->data);
    }

    public function updateOrder()
    {
        // $logger = service('logger');
        $lessonOrder = $this->request->getJSON(true)['lessonOrder'];
        foreach ($lessonOrder as $key => $lesson) {
            $data = ['order' => $key + 1];
            $this->lesson_model->edit($data, ['id' => $lesson]);
            // $logger->error('subject order Error: ' . db_connect()->getLastQuery());


        }
        session()->setFlashdata('message_success', "Order updated Successfully!");
        return json_encode(['data'=> 1]);
    }
    

    protected function propagate_new_child_addition(string $type, int $new_id)
    {
        if ($this->is_syncing) return;
        $this->is_syncing = true;

        switch ($type) {

            /*** ───────────────────────────── LESSON ───────────────────────────── ***/
            case 'lesson':
                $orig = $this->lesson_model->get(['id' => $new_id])->getRowArray();
                if (!$orig) break;

                // Find subject of the newly added lesson
                $subject = $this->subject_model->get(['id' => $orig['subject_id']])->getRowArray();
                if (!$subject) break;

                // Identify master subject
                $group_master_id = $subject['master_subject_id'] ?? $subject['id'];

                // Get all subjects cloned from the same master
                $group_subjects = $this->subject_model
                    ->get(['master_subject_id' => $group_master_id])
                    ->getResultArray();

                // Include master subject (only if not already in the list)
                $already_has_master = array_filter($group_subjects, fn($s) => $s['id'] == $group_master_id);
                if (empty($already_has_master)) {
                    $master_subject = $this->subject_model->get(['id' => $group_master_id])->getRowArray();
                    if ($master_subject) $group_subjects[] = $master_subject;
                }

                // Avoid duplicate additions
                $processed_subjects = [];

                foreach ($group_subjects as $s) {
                    if (in_array($s['id'], $processed_subjects)) continue;
                    $processed_subjects[] = $s['id'];

                    // Skip the one where the lesson was originally added
                    if ($s['id'] == $orig['subject_id']) continue;

                    $clone = $orig;
                    unset($clone['id']);
                    $clone['subject_id'] = $s['id'];
                    $clone['course_id'] = $s['course_id'];
                    $clone['master_lesson_id'] = $orig['master_lesson_id'] ?? $new_id;
                    $clone['created_at'] = date('Y-m-d H:i:s');
                    $clone['updated_at'] = date('Y-m-d H:i:s');
                    $clone['created_by'] = get_user_id();

                    $this->lesson_model->add($clone);
                }

                break;
        }

        $this->is_syncing = false;
    }







    
    protected function propagate_lesson_update(int $lesson_id, array $updated_fields = [])
    {
        if ($this->is_syncing) return;
        $this->is_syncing = true;

        $orig = $this->lesson_model->get(['id' => $lesson_id])->getRowArray();
        if (!$orig) { $this->is_syncing = false; return; }

        // Determine master id: use master_lesson_id if set, otherwise use id as group master
        $group_master_id = $orig['master_lesson_id'] ?: $orig['id'];

        // Fetch all lessons in group: where master_lesson_id = master OR id = master
        $group_lessons = $this->lesson_model
            ->get(['master_lesson_id' => $group_master_id])
            ->getResultArray();

        // include master if needed
        if ($group_master_id != $lesson_id && $group_master_id != $orig['id']) {
            $master_l = $this->lesson_model->get(['id' => $group_master_id])->getRowArray();
            if ($master_l) $group_lessons[] = $master_l;
        }

        if (empty($updated_fields)) {
            $updated_fields = $orig;
            unset(
                $updated_fields['id'],
                $updated_fields['created_at'],
                $updated_fields['course_id'],   //  don't overwrite the course
                $updated_fields['subject_id'],   //  don't overwrite the subject
                $updated_fields['free'],   //  don't overwrite the free
                $updated_fields['order'],   //  don't overwrite the order - leep old order independent
                $updated_fields['created_by'],
                $updated_fields['master_lesson_id'] //  keep clone linkage
            );
        }

        foreach ($group_lessons as $l) {
            if ($l['id'] == $lesson_id) continue;
            $to_update = $updated_fields;
            $to_update['updated_at'] = date('Y-m-d H:i:s');
            $to_update['updated_by'] = get_user_id();
            $this->lesson_model->edit($to_update,['id' => $l['id']] );
            //log_message('error', 'Propagated lesson update: ' .$l['id'] . ' ' . json_encode($to_update));
        }

        $this->is_syncing = false;
    }


}
