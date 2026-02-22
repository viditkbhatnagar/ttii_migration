<?php
namespace App\Controllers\Admin;
use App\Models\Settings_model;
use App\Models\Frontend_setting_model;
class Settings extends AppBaseController
{
    private $settings_model;
    public function __construct()
    {
        parent::__construct();
        $this->settings_model = new Settings_model();
        $this->frontend_setting_model = new Frontend_setting_model();
    }

    
     public function app_version(){
        
       $items = [
            'android_version' => 'android_version',
            'ios_force_update' => 'ios_force_update',
        ];
        
        foreach ($items as $key => $item) {
            $this->data[$key] = $this->settings_model->get(['key' => $item])->getRowArray();
        }
 
        $this->data['page_title'] = 'Settings';
        $this->data['page_name'] = 'Settings/app_version';
        return view('Admin/index', $this->data);
    }
    
    public function edit_app_version()
    {
        $logger = service('logger');
    
        if ($this->request->getMethod() === 'post') {
            $settingsItems = [
                'android_version' => 'android_version',
                'ios_force_update' => 'ios_force_update'
            ];
    
            $current_time = date('Y-m-d H:i:s');
            $user_id = get_user_id();
            $response = true; // Assuming success by default
    
            foreach ($settingsItems as $item => $postKey) {
                $value = $this->request->getPost($postKey);
                $data = [
                    'value' => $value,
                    'updated_by' => $user_id,
                    'updated_at' => $current_time
                ];
                $response = $response && $this->settings_model->edit($data, ['key' => $item]);
            }
    
            if ($response) {
                session()->setFlashdata('message_success', "Settings Updated Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
    
        return redirect()->to(base_url('admin/settings/app_version'));
    }
    
 
    
}
