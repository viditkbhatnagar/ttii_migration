<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\Live_class_model; // Replace with your model namespace
use Firebase\JWT\JWT;

class Zoom extends BaseController
{
    protected $live_class_model; // Define your model property

    public function __construct()
    {
        $this->live_class_model = new Live_class_model(); // Initialize your model
    }

    // Index Page
    public function index($id = 0, $cohort_id = 0)
    {
        if ($id <= 0) {
            return redirect()->to(base_url('app/live_class/index'));
        }

        $this->data['live_class'] = $this->live_class_model->get(['id' => $id])->getRowArray();
        $this->data['page_title'] = 'Start Session';
        $this->data['page_name'] = 'Zoom/index';

        return view('Admin/index', $this->data);
    }

    // start Meeting
    public function start()
    {
        $this->data['live_class'] = $this->live_class_model->get(['id' => $this->request->getGet('live_class_id')])->getRowArray();

        return view('Admin/Zoom/start', $this->data);
    }

    // Live Meeting
    public function meeting()
    {
        return view('Admin/Zoom/meeting');
    }

    public function generate_signature()
    {
        $meetingNumber = preg_replace('/\D+/', '', (string) $this->request->getGet('meeting_number'));
        $role = (int) ($this->request->getGet('role') ?? 1);
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
