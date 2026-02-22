<?php
namespace App\Controllers\Admin;
use App\Models\Banner_model;
use App\Models\Course_model;

class Banners extends AppBaseController
{
    private $banner_model;
    private $course_model;
    public function __construct()
    {
        parent::__construct();
        $this->banner_model = new Banner_model();
        $this->course_model = new Course_model();
    }

    public function index(){
        
        $this->data['list_items'] = $this->banner_model->get()->getResultArray();
        foreach ($this->data['list_items'] as &$item) {
            if (!empty($item['course_id'])) {
                $course_data = $this->course_model->get(['id' => $item['course_id']])->getRowArray();
                $item['course'] = $course_data['title'] ?? '';
            } else {
                $item['course'] = '';
            }
        }
        unset($item); // break the reference
        
        $this->data['page_title'] = 'Banners';
        $this->data['page_name'] = 'Banners/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add(){
        $this->data['courses'] = $this->course_model->get([], ['id', 'title'])->getResultArray();
        echo view('Admin/Banners/ajax_add', $this->data);
    }

    public function test(){
        phpinfo();
    }
    
    public function add(){
        if($this->request->getMethod() === 'post'){
            $is_course_banner = $this->request->getPost('is_course_banner') == '0' ? 0 : 1;
            $course_id = $this->request->getPost('course_id');
            
            // Validate course selection when is_course_banner is checked
            if($is_course_banner && empty($course_id)){
                session()->setFlashdata('message_danger', "Course selection is required when 'Is Course related banner' is checked!");
                return redirect()->back();
            }
            
            $data = [
                'title' => $this->request->getPost('title'),
                'url' => $this->request->getPost('url'),
                'type'  => $this->request->getPost('type'),
                'course_id'  => $course_id,
                'is_course_banner'  => $is_course_banner,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            $image = $this->upload_file('banners','image');
            if($image && valid_file($image['file'])){
                $data['image'] = $image['file'];
            }
			
			
			
            $cat_id = $this->banner_model->add($data);
            if ($cat_id){
                session()->setFlashdata('message_success', "Banners Added Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/banners/index'));
    }

    public function ajax_edit($id){
        $this->data['edit_data'] = $this->banner_model->get(['id' => $id])->getRowArray();
        $this->data['courses'] = $this->course_model->get([], ['id', 'title'])->getResultArray();
        echo view('Admin/Banners/ajax_edit', $this->data);
    }

    public function edit($id){
        if($this->request->getMethod() === 'post'){
            $is_course_banner = $this->request->getPost('is_course_banner') == '0' ? 0 : 1;
            $course_id = $this->request->getPost('course_id');
            
            // Validate course selection when is_course_banner is checked
            if($is_course_banner && empty($course_id)){
                session()->setFlashdata('message_danger', "Course selection is required when 'Is Course related banner' is checked!");
                return redirect()->back();
            }
            
            $data = [
                'title' => $this->request->getPost('title'),
                'url' => $this->request->getPost('url'),
                'type'  => $this->request->getPost('type'),
                'course_id'  => $course_id,
                'is_course_banner'  => $is_course_banner,
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
             $image = $this->upload_file('banners','image');
                if($image && valid_file($image['file'])){
    				$data['image'] = $image['file'];
    			}
			
			
            $response = $this->banner_model->edit($data, ['id' => $id]);
            if ($response){
                session()->setFlashdata('message_success', "Banners Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
            
        }
        return redirect()->to(base_url('admin/banners/index'));
    }

    public function ajax_view($id){
        $this->data['view_data'] = $this->banner_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Banners/ajax_view', $this->data);
    }

    public function delete($id){
        if($id > 0){
            if ($this->banner_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Banners Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/banners/index'));
    }
    
}
