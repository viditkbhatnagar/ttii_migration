<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\Live_settings_m; // Replace with your model namespace
use App\Models\Live_class_model; // Replace with your model namespace
use Firebase\JWT\JWT;

class Live extends BaseController
{
    protected $live_settings_model; // Define your model property
    protected $live_class_model; // Define your model property

    public function __construct()
    {
        $this->live_settings_model = new Live_settings_m(); // Initialize your model
        $this->live_class_model = new Live_class_model(); // Initialize your model
    }

    // Index Page
    public function index($zoom_id = 0)
    {
        if ($zoom_id <= 0) {
            return redirect()->to(base_url('admin/live_class/index'));
        }

        $this->data['live_class'] = $this->live_class_model->get(['id' => $zoom_id])->getRowArray();
        $this->data['page_title'] = 'Start Live Class';
        $this->data['page_name'] = 'Live/index';

        return view('Admin/index', $this->data);
    }

    // start Meeting
    public function start()
    {
        $this->data['live_settings'] = $this->live_settings_model->get(['id' => 1])->getRowArray();
        $this->data['live_class'] = $this->live_class_model->get(['zoom_id' => $this->request->getGet('live_class_id')])->getRowArray();

        return view('Admin/Live/start', $this->data);
    }

    // Live Meeting
    public function meeting()
    {
        return view('Admin/Live/meeting');
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
