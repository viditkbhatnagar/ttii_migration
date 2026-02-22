<?php

namespace App\Controllers\App;

use App\Controllers\App\UserBaseController;
use App\Models\Live_class_model;
use App\Models\Course_model;
use App\Models\Live_settings_m;
use App\Models\Users_model;
use Firebase\JWT\JWT;

class Live extends UserBaseController
{
    private $live_class_model;
    private $course_model;
    private $live_settings_m;
    private $users_model;

    public function __construct()
    {
        $this->live_class_model = new Live_class_model();
        $this->course_model = new Course_model();
        $this->live_settings_m = new Live_settings_m();
        $this->users_model = new Users_model();
        parent::__construct();
    }

    public function index($zoom_id=0, $user_id = 0){
        
        if($zoom_id <= 0){
            redirect($_SERVER['HTTP_REFERER']);
        }
        
        // Fetch live classes and course list
        $live_class = $this->live_class_model->get(['id' => $zoom_id])->getRowArray();

        // Prepare data for the view
        $this->data['live_class'] = $live_class;
        
        
        $this->data['page_title'] = 'Live Class';
        $this->data['page_name'] = 'Live/index';

        // Load the view
        return view('App/index', $this->data);
    }
    
    
    public function start() {
        
        $this->data['live_class']   = $this->live_class_model->get(['id' => $this->request->getGet('live_class_id')])->getRowArray();
        $this->data['live_settings'] = $this->live_settings_m->get(['meeting_id' => $this->data['live_class']['zoom_id']])->getRowArray();
        
        
        
        $this->data['user'] = $this->users_model->get(['id' => $_SESSION['user_id']])->getRowArray();
        
        $this->data['page_title'] = 'Start Hosting';
        // echo"<pre>";print_r($this->data);die();
        return view('App/Live/start', $this->data);
    }
    
    
    public function meeting() {
        
        // log_message('error',print_r($this->data['live_settings'],true));
        
        $this->data['page_title'] = 'Start Hosting';
        
        return view('App/Live/meeting', $this->data);
    }

    public function generate_signature()
    {
        $meetingNumber = preg_replace('/\D+/', '', (string) $this->request->getGet('meeting_number'));
        $role = (int) ($this->request->getGet('role') ?? 0);
        $role = $role === 1 ? 1 : 0;

        if ($meetingNumber === '') {
            return $this->response->setJSON([
                'status' => 0,
                'message' => 'Invalid meeting number',
                'data' => []
            ]);
        }

        $key = (string) get_settings('zoom_api_key');
        $secret = (string) get_settings('zoom_secret_key');
        if ($key === '' || $secret === '') {
            return $this->response->setJSON([
                'status' => 0,
                'message' => 'Zoom credentials are not configured',
                'data' => []
            ]);
        }

        $iat = time() - 30;
        $exp = $iat + 60 * 60 * 2;
        $tokenData = [
            'sdkKey' => $key,
            'appKey' => $key,
            'mn' => $meetingNumber,
            'role' => $role,
            'iat' => $iat,
            'exp' => $exp,
            'tokenExp' => $exp,
        ];

        $jwt = JWT::encode($tokenData, $secret, 'HS256');
        return $this->response->setJSON([
            'status' => 1,
            'message' => 'success',
            'data' => [
                'jwt_token' => $jwt,
                'sdk_key' => $key
            ]
        ]);
    }
    
    
    
}
