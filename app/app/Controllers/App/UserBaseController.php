<?php
namespace App\Controllers\App;
use App\Controllers\BaseController;

abstract class UserBaseController extends BaseController
{
    protected $data = [];

    public function __construct()
    {
        $this->user_id = get_user_id();
        $this->course_id = get_primary_course_id();
    }
}
