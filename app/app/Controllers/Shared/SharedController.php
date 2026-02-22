<?php
//File: app/Controllers/Api/Api.php

namespace App\Controllers\Shared;

use App\Controllers\BaseController;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\API\ResponseTrait;

class SharedController extends BaseController
{
    use ResponseTrait;

    protected $user_data;
    protected $user_id;
    protected $is_team_lead;
    protected $is_team_manager;
    protected $current_role;
    protected $response_data;

    public function __construct()
    {
        helper('auth');



    }


}