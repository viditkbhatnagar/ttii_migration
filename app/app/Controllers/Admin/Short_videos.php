<?php
namespace App\Controllers\Admin;
use App\Models\Short_videos_model;
use App\Models\Course_model;

class Short_videos extends AppBaseController
{
    private $wellness_category_model;
    public function __construct()
    {
        parent::__construct();
        $this->short_videos_model = new Short_videos_model();
        $this->course_model = new Course_model();
    }

    public function index(){
        $videos = $this->short_videos_model->get([],[],['id'=>'desc'])->getResultArray();
        
        $this->data['list_items'] = $videos;
        
        $this->data['page_title'] = 'Short Videos';
        $this->data['page_name'] = 'Short_videos/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add(){
        $this->data['course']   = $this->course_model->get()->getResultArray();
        echo view('Admin/Short_videos/ajax_add', $this->data);
    }

    public function add(){
        
        // echo "<pre>";
        // print_r($_POST); exit();
        if ($this->request->getMethod() === 'post'){
            
            $data = [
                'title' => $this->request->getPost('title'),
                'uploaded_video' => $this->request->getPost('uploaded_video'),
                'set_as_popular' => ($this->request->getPost('set_as_popular') == 1) ? 1 : 0,
                'set_as_trending' => ($this->request->getPost('set_as_trending') == 1) ? 1 : 0,

                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
                'updated_by' => get_user_id(),
            ];
            
            $image = $this->upload_file('short_videos','image');
            if($image){
    			$data['thumbnail'] = $image['file'];
    		}else{
    		    $data['thumbnail'] = '';
    		}
            
			
            $cat_id = $this->short_videos_model->add($data);
            if ($cat_id){
                session()->setFlashdata('message_success', "Category Added Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/short_videos/index'));
    }

    public function ajax_edit($id){
        $this->data['course']   = $this->course_model->get()->getResultArray();
        $this->data['edit_data'] = $this->short_videos_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Short_videos/ajax_edit', $this->data);
    }

    public function edit($id){
        
        if ($this->request->getMethod() === 'post'){
            
            $data = [
                'title' => $this->request->getPost('title'),
                'set_as_popular' => ($this->request->getPost('set_as_popular') == 1) ? 1 : 0,
                'set_as_trending' => ($this->request->getPost('set_as_trending') == 1) ? 1 : 0,
                
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            
            if(!empty($this->request->getPost('uploaded_video')))
            {
                $data['uploaded_video'] = $this->request->getPost('uploaded_video');
            }
            

            $image = $this->upload_file('short_videos','image');
             if($image && valid_file($image['file'])){
    				$data['thumbnail'] = $image['file'];
    			}
	
			
            $response = $this->short_videos_model->edit($data, ['id' => $id]);
            if ($response){
                session()->setFlashdata('message_success', "Video Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/short_videos/index'));
    }

   
    public function delete($id){
        if($id > 0){
            if($this->short_videos_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Category Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/short_videos/index'));
    }
    
    
    public function upload_video()
    {
        $file = $this->request->getFile('file'); // 'file' matches Dropzone's default field name
    
        if ($file && $file->isValid()) {
            // Validate file type
            $allowedTypes = ['video/mp4', 'video/avi', 'video/mkv'];
            if (!in_array($file->getMimeType(), $allowedTypes)) {
                return $this->response->setJSON(['error' => 'Invalid video format']);
            }
    
            // Save the file
            $newName = $file->getRandomName();
            $file->move(WRITEPATH . 'uploads/short_videos', $newName);
    
            // Return the file path for further processing
            return $this->response->setJSON([
                'success' => true,
                'filePath' => 'uploads/short_videos/' . $newName
            ]);
        }
    
        return $this->response->setJSON(['error' => 'File upload failed']);
    }
    
    
    public function remove_video()
    {
        $request = $this->request->getJSON();
        $filePath = $request->filePath ?? '';
    
        if ($filePath && file_exists(FCPATH . str_replace(base_url(), '', $filePath))) {
            unlink(FCPATH . str_replace(base_url(), '', $filePath)); // Delete the file
            return $this->response->setJSON(['success' => true]);
        }
    
        return $this->response->setJSON(['error' => 'File not found or cannot be deleted']);
    }


    
}
