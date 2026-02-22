<?php
namespace App\Controllers\Admin;
use App\Models\Demo_video_model;
use App\Models\Course_model;
class Demo_video extends AppBaseController
{
    private $demo_video_model;
    private $course_model;
    public function __construct()
    {
        parent::__construct();
        $this->demo_video_model = new Demo_video_model();
        $this->course_model = new Course_model();
        
    }

    public function index(){
        $course = $this->course_model->get()->getResultArray();
        $this->data['course'] = array_column($course, 'title', 'id');
        $this->data['list_items'] = $this->demo_video_model->get()->getResultArray();
        $this->data['page_title'] = 'Demo Video';
        $this->data['page_name'] = 'Demo_video/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add(){
        $this->data['courses']       = $this->course_model->get()->getResultArray();
        echo view('Admin/Demo_video/ajax_add', $this->data);
    }
    
    public function add(){
        if ($this->request->getMethod() === 'post'){
            $data = [
                'title' => $this->request->getPost('title'),
                'course_id' => $this->request->getPost('course_id'),
                // 'summary' => $this->request->getPost('summary'),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            
            $data['video_url']  = $this->request->getPost('video_url');
            // $duration_formatter = explode(':', $this->request->getPost('duration'));
            // $hour               = sprintf('%02d', $duration_formatter[0]);
            // $min                = sprintf('%02d', $duration_formatter[1]);
            // $sec                = sprintf('%02d', $duration_formatter[2]);
            // $data['duration']       = $hour . ':' . $min . ':' . $sec;
            $data['video_type']     = $this->request->getPost('video_type');
            
            $thumbnail = $this->upload_file('demo_video','thumbnail');
            
            if($thumbnail && valid_file($thumbnail['file'])){
				$data['thumbnail'] = $thumbnail['file'];
			}
            
            $response = $this->demo_video_model->add($data);
            if ($response){
                session()->setFlashdata('message_success', "Demo Video Added Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/demo_video/index'));
    }
    
    public function ajax_edit($id){
        $this->data['courses']       = $this->course_model->get()->getResultArray();
        $this->data['edit_data'] = $this->demo_video_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Demo_video/ajax_edit', $this->data);
    }

    public function edit($id){
        if ($this->request->getMethod() === 'post'){
            $data = [
                'title' => $this->request->getPost('title'),
                'course_id' => $this->request->getPost('course_id'),
                // 'summary' => $this->request->getPost('summary'),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            
            $data['video_url']  = $this->request->getPost('video_url');
            // $duration_formatter = explode(':', $this->request->getPost('duration'));
            // $hour               = sprintf('%02d', $duration_formatter[0]);
            // $min                = sprintf('%02d', $duration_formatter[1]);
            // $sec                = sprintf('%02d', $duration_formatter[2]);
            // $data['duration']       = $hour . ':' . $min . ':' . $sec;
            $data['video_type']     = $this->request->getPost('video_type');
            
            $thumbnail = $this->upload_file('subject','thumbnail');
            if($thumbnail && valid_file($thumbnail['file'])){
				$data['thumbnail'] = $thumbnail['file'];
			}
            $response = $this->demo_video_model->edit($data, ['id' => $id]);
            if ($response){
                session()->setFlashdata('message_success', "Demo Video Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/demo_video/index'));
    }

    public function delete($id){
        if ($id > 0){
            if ($this->demo_video_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Demo Video Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/demo_video/index'));
    }
    
}
