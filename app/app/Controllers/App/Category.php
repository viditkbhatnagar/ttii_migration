<?php

namespace App\Controllers\App;
use App\Controllers\App\UserBaseController;
use App\Models\Course_model;
use App\Models\Category_model;

class Category extends UserBaseController
{
    private $course_model;
    private $category_model;
    public function __construct()
    {
        parent::__construct();
        $this->course_model = new Course_model();
        $this->category_model = new Category_model();
    }

    public function index($category_id = 0)
    {
        $this->data['courses'] = $this->course_model->get(['category_id' => $category_id])->getResultArray();
        $this->data['category_data'] = $this-> category_model->get(['id' => $category_id])->getRowArray();
        // echo("<pre>");
        // print_r($this->data['category_data']);die();
        $this->data['page_title'] = 'Course Category';
        $this->data['page_name'] = 'Category/index';
        return view('App/index', $this->data);
    }
    
    
}
