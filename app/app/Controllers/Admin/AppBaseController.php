<?php
namespace App\Controllers\Admin;
use App\Controllers\BaseController;

abstract class AppBaseController extends BaseController
{
    protected $data = [];
    public function __construct()
    {
        if(!(is_logged_in())){
            return redirect()->to(base_url('login/index'));
        }
    }


}
