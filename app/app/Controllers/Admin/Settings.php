<?php
namespace App\Controllers\Admin;
use App\Models\Settings_model;
use App\Models\Frontend_setting_model;
use App\Models\App_version_model;


class Settings extends AppBaseController
{
    private $settings_model;
    public function __construct()
    {
        parent::__construct();
        $this->settings_model = new Settings_model();
        $this->frontend_setting_model = new Frontend_setting_model();
        $this->app_version_model = new App_version_model();
    }

    public function index(){
      
 
        $this->data['page_title'] = 'Settings';
        $this->data['page_name'] = 'Settings/index';
        return view('App/index', $this->data);
    }
    
    
    public function system_settings(){
        if ($this->request->getMethod() === 'post') {
            $keys = ['system_name', 'system_title', 'author', 'privacy_policy', 'system_email', 'address', 'phone', 'website_description','website_keywords'];

            foreach ($keys as $key) {
                $data['value'] = htmlspecialchars($this->request->getPost($key));
                $this->settings_model->edit($data, ['key' => $key]);
            }
            session()->setFlashdata('message_success', "Settings Updated Successfully!");
            return redirect()->to(base_url('admin/settings/system_settings'));
        }
        
        
        $this->data['page_title'] = 'System Settings';
        $this->data['page_name'] = 'Settings/system_setting';
        return view('Admin/index', $this->data);
    }
    
    
    public function contact_settings(){
        
        if ($this->request->getMethod() === 'post') {
            $keys = array('contact_whatsapp', 'contact_phone','contact_email','contact_address');

            foreach ($keys as $key) {
                $data['value'] = htmlspecialchars($this->request->getPost($key));
                $this->settings_model->edit($data, ['key' => $key]);
            }
            session()->setFlashdata('message_success', "Settings Updated Successfully!");
            return redirect()->to(base_url('admin/settings/contact_settings'));
        }

        
        $this->data['page_title'] = 'Contact Settings';
        $this->data['page_name'] = 'Settings/contact_settings';
        return view('Admin/index', $this->data);
    }
    public function website_settings($param=""){
        
        if ($param=="frontend_update") {
            $keys = array('banner_title', 'banner_sub_title', 'cookie_status', 'cookie_note', 'cookie_policy', 'address', 'about_us', 'terms_and_condition','privacy_policy' );

            foreach ($keys as $key) {
                $data['value'] = htmlspecialchars($this->request->getPost($key));
                $this->frontend_setting_model->edit($data, ['key' => $key]);
            }
            session()->setFlashdata('message_success', "Settings Updated Successfully!");
            return redirect()->to(base_url('admin/settings/website_settings'));
        }
        
        if ($param=="light_logo") {
            $key = 'light_logo';
            
            $image = $this->upload_file('system',$key);
                    if($image && valid_file($image['file'])){
        				$data['value'] = $image['file'];
        			}else{
        			    $data['value'] = "";
        			}
            $this->frontend_setting_model->edit($data, ['key' => $key]);
            
            session()->setFlashdata('message_success', "Light Logo Updated Successfully!");
            return redirect()->to(base_url('admin/settings/website_settings'));
        }
        if ($param=="dark_logo") {
            $key = 'dark_logo';
            
            $image = $this->upload_file('system',$key);
                    if($image && valid_file($image['file'])){
        				$data['value'] = $image['file'];
        			}else{
        			    $data['value'] = "";
        			}
            $this->frontend_setting_model->edit($data, ['key' => $key]);
            
            session()->setFlashdata('message_success', "Dark Logo Updated Successfully!");
            return redirect()->to(base_url('admin/settings/website_settings'));
        }
        if ($param=="small_logo") {
            $key = 'small_logo';
            
            $image = $this->upload_file('system',$key);
                    if($image && valid_file($image['file'])){
        				$data['value'] = $image['file'];
        			}else{
        			    $data['value'] = "";
        			}
            $this->frontend_setting_model->edit($data, ['key' => $key]);
            
            session()->setFlashdata('message_success', "Small Logo Updated Successfully!");
            return redirect()->to(base_url('admin/settings/website_settings'));
        }
        if ($param=="favicon") {
            $key = 'favicon';
            
            $image = $this->upload_file('system',$key);
                    if($image && valid_file($image['file'])){
        				$data['value'] = $image['file'];
        			}else{
        			    $data['value'] = "";
        			}
            $this->frontend_setting_model->edit($data, ['key' => $key]);
            
            session()->setFlashdata('message_success', "FavIcon Updated Successfully!");
            return redirect()->to(base_url('admin/settings/website_settings'));
        }

        $this->data['light_logo'] = $this->frontend_setting_model->get(['id' => 17])->getRowArray();
        $this->data['dark_logo'] = $this->frontend_setting_model->get(['id' => 18])->getRowArray();
        $this->data['small_logo'] = $this->frontend_setting_model->get(['id' => 19])->getRowArray();
        $this->data['favicon'] = $this->frontend_setting_model->get(['id' => 20])->getRowArray();
        // log_message('error',' lih '.print_r($this->data['light_logo'],true));
        $this->data['page_title'] = 'Website Settings';
        $this->data['page_name'] = 'Settings/website_settings';
        return view('Admin/index', $this->data);
    }

    
    
    
     public function app_version(){

        $this->data['edit_data'] = $this->app_version_model->get()->getRowArray();
 
        $this->data['page_title'] = 'Settings';
        $this->data['page_name'] = 'Settings/app_version';
        return view('Admin/index', $this->data);
    }
    
    public function edit_app_version()
    {
        $logger = service('logger');
    
        if ($this->request->getMethod() === 'post') {
          
            $current_time = date('Y-m-d H:i:s');
            $user_id = get_user_id();
       
            $version =$this->app_version_model->get()->getRowArray();
            
                $data = [
                    'app_version' => $this->request->getPost('app_version'),
                    'app_version_ios' => $this->request->getPost('app_version_ios'),

                    'updated_by' => $user_id,
                    'updated_at' => $current_time
                ];
                $response = $this->app_version_model->edit($data, ['id' => $version['id']]);
            
    
            if ($response) {
                session()->setFlashdata('message_success', "Settings Updated Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
    
        return redirect()->to(base_url('admin/settings/app_version'));
    }
    
    
    public function intro_video()
    {
        if ($this->request->getMethod() === 'post') 
        {
            $data['value'] = $this->request->getPost('uploaded_video');
            $this->frontend_setting_model->edit($data, ['key' => 'intro_video']);
            
            
            session()->setFlashdata('message_success', "Settings Updated Successfully!");
            return redirect()->to(base_url('admin/settings/system_settings'));
        }
        
        $this->data['intro_video'] = $this->frontend_setting_model->get(['id' => '21'])->getRowArray();
        
        // print_r($this->data['intro_video']); exit();
        
        $this->data['page_title'] = 'Introduction Video';
        $this->data['page_name'] = 'Settings/intro_video';
        return view('Admin/index', $this->data);
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
            $file->move(WRITEPATH . 'uploads/intro_video', $newName);
    
            // Return the file path for further processing
            return $this->response->setJSON([
                'success' => true,
                'filePath' => 'uploads/intro_video/' . $newName
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
