<?php

namespace App\Controllers\App;

use App\Controllers\App\UserBaseController;


class Calendar extends UserBaseController
{

    public function __construct()
    {
        parent::__construct();
    }

    public function index()
    {
        $this->data['page_title'] = 'Calendar';
        $this->data['page_name'] = 'Calendar/index';
        return view('App/index', $this->data);
    }
    
    public function events()
    {
        $events = [
            [
                'title' => 'Meeting',
                'start' => '2025-05-15',
            ],
            [
                'title' => 'Conference',
                'start' => '2025-05-20',
                'end'   => '2025-05-22',
            ],
            [
                'title' => 'Birthday Party',
                'start' => '2025-05-25T19:00:00',
            ],
        ];

        return $this->response->setJSON($events);
    }
}