<?php
namespace App\Controllers\Admin;
use App\Models\Batch_model;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Subject_model;
use App\Models\Lesson_model;
use App\Models\Topic_model;
use App\Models\Lesson_file_model;


class Topic extends AppBaseController
{
    private $batch_model;
    private $course_model;
    private $users_model;
    private $subject_model;
    private $lesson_model;
    private $topic_model;
    private $lesson_file_model;


    public function __construct()
    {
        parent::__construct();
        $this->batch_model = new Batch_model();
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->subject_model = new Subject_model();
        $this->topic_model = new Topic_model();
        $this->lesson_model = new Lesson_model();
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
    
    public function ajax_add($course,$subject,$lesson)
    {
        $this->data['subjects'] = $this->subject_model->get(['course_id'=>$course])->getResultArray();
        $this->data['course_id'] = $course;
        $this->data['subject_id'] = $subject;
        $this->data['lesson_id'] = $lesson;

        echo view('Admin/Topic/ajax_add', $this->data);
    }

    public function add()
    {
        $course = $this->request->getPost('course_id');
        if ($this->request->getMethod() === 'post'){
         
                $data = [
                    'title'     => $this->request->getPost('title'),
                    'course_id' => $this->request->getPost('course_id'),
                    'subject_id' => $this->request->getPost('subject_id'),
                    'lesson_id' => $this->request->getPost('lesson_id'),
                    'summary' => $this->request->getPost('summary'),
                    'free' => ($this->request->getPost('free') == 1) ? 'on' : 'off',
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
                
                  $thumbnail = $this->upload_file('lesson','thumbnail');
                    if($thumbnail && valid_file($thumbnail['file'])){
        				$data['thumbnail'] = $thumbnail['file'];
        			}
    			
                $cat_id = $this->topic_model->add($data);
                if ($cat_id){
                    session()->setFlashdata('message_success', "Lesson Added Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
           
        }
        return redirect()->to(base_url('admin/course/add_details/'.$course));
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
        }
        return redirect()->to(base_url('admin/course/details/'.$course));
    }

    public function ajax_view($id){
        $this->data['course'] = $this->course_model->get_array_column([], 'id', 'title');
        $this->data['view_data'] = $this->batch_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Batch/ajax_view', $this->data);
    }

    public function delete($id){
        if ($id > 0){
            $lesson_file_data = $this->lesson_file_model->get(['lesson_id' => $id])->getNumRows();
            if($lesson_file_data==0){
                if ($this->lesson_model->remove(['id' => $id])){
                    session()->setFlashdata('message_success', "Lesson Deleted Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            }else{
                session()->setFlashdata('message_danger', "You can\'t Delete This Lesson!");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/course/index'));
    }
    
     public function ajax_sort($id){

        $this->data['lessons'] = $this->lesson_model->get(['course_id' => $id],null,['order'=>'asc'])->getResultArray();
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
    
    
    

}
