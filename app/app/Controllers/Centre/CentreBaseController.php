<?php
namespace App\Controllers\Centre;
use App\Controllers\BaseController;

abstract class CentreBaseController extends BaseController
{
    protected $data = [];

    public function __construct()
    {
        $this->user_id = get_user_id();
        $this->course_id = get_primary_course_id();
    }
}