<?php
namespace App\Controllers\Admin;
use App\Models\Stories_model;
use App\Models\Course_model;

class Stories extends AppBaseController
{
    private $batch_model;
    private $course_model;
    private $users_model;


    public function __construct()
    {
        parent::__construct();
        $this->stories_model = new Stories_model();
        $this->course_model = new Course_model();
    }

    public function index(){
        
        $this->data['list_items'] = $this->stories_model->get()->getResultArray();
        $this->data['page_title'] = 'Stories';
        $this->data['page_name'] = 'Stories/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add(){
        $this->data['courses']   = $this->course_model->get()->getResultArray();
        echo view('Admin/Stories/ajax_add', $this->data);
    }

    public function add(){
        if ($this->request->getMethod() === 'post'){
            $data = [
                'title'             => $this->request->getPost('title'),
                'course_id'         => $this->request->getPost('course_id'),
                'date'              => $this->request->getPost('date'),
                'created_by'        => get_user_id(),
                'created_at'        => date('Y-m-d H:i:s'),
            ];
            
            $image = $this->upload_file('stories','image');
                if($image){
        			$data['image'] = $image['file'];
        		}else{
        		    $data['image'] = '';
        		}
            
            $inserted_id = $this->stories_model->add($data);
            if ($inserted_id){
                session()->setFlashdata('message_success', "Added Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/stories/index'));
    }

    public function ajax_edit($id){ 
        $this->data['courses']   = $this->course_model->get()->getResultArray();
        $this->data['edit_data'] = $this->stories_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Stories/ajax_edit', $this->data);
    }

    public function edit($id){
        if ($this->request->getMethod() === 'post'){
            $data = [
                'title'             => $this->request->getPost('title'),
                'course_id'         => $this->request->getPost('course_id'),
                'date'              => $this->request->getPost('date'),
                'updated_by'        => get_user_id(),
                'updated_at'        => date('Y-m-d H:i:s'),
            ];
            
            $image = $this->upload_file('feed','image');
                if($image){
        			$data['image'] = $image['file'];
        		}
            $response = $this->stories_model->edit($data, ['id' => $id]);
            if ($response){
                session()->setFlashdata('message_success', "Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/stories/index'));
    }

    // public function ajax_view($id){
    //     $this->data['course'] = $this->course_model->get_array_column([], 'id', 'title');
    //     $this->data['view_data'] = $this->feed_category_model->get(['id' => $id])->getRowArray();
    //     echo view('Admin/Batch/ajax_view', $this->data);
    // }

    public function delete($id){
        if ($id > 0){
            if ($this->stories_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/stories/index'));
    }
    public function get_story_status(){
        $story_id = $this->request->getPost('story_id');
        $if_taken = $this->stories_model->get(['id' => $story_id])->getRow();
        if($if_taken->status==0){
            $data['status'] = 1;
            $response = $this->stories_model->edit($data, ['id' => $story_id]);
        }else{
            $data['status'] = 0;
            $response = $this->stories_model->edit($data, ['id' => $story_id]);
        }
        
    }
    
    

}
