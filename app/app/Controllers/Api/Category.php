<?php
//File: app/Controllers/Api/Home.php

namespace App\Controllers\Api;

use App\Controllers\Api\Api;
use App\Models\Category_model;
use App\Models\Course_model;
use App\Models\Enrol_model;
use App\Models\Review_model;

class Category extends Api
{
    private $users_model;
    public function __construct(){
        $this->category_model = new Category_model();
        $this->course_model = new Course_model();
        $this->enrol_model = new Enrol_model();
        $this->review_model = new Review_model();
    }
    
    /*** Category List ***/
    public function index()
    {
        $this->is_valid_request(['GET']);
        $categories = $this->category_model->get()->getResultArray();
        
        $category_data = [];
        foreach($categories as $category){
            $category_data[] = $this->category_model->category_data($category);
        }
        
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $category_data];
        return $this->set_response();
    }
    
    /*** Category Details ***/
    public function get_category_details()
    {
        $this->is_valid_request(['GET']);
        
        $category_id = $this->request->getGet('category_id');

        // Get category details
        $category = $this->category_model->get(['id' => $category_id])->getRowArray();

        if (!$category) {
            return $this->response->setJSON([
                'status' => 'error',
                'message' => 'Category not found'
            ]);
        }

        // Get courses under this category
        $courses = $this->course_model->get(['category_id' => $category_id])->getResultArray();
        $enrollCount = 0;
        // Get enrollment count
        foreach($courses as $key => $course){
            $courses[$key]['thumbnail'] = valid_file($course['thumbnail'] ?? '') ? base_url(get_file($course['thumbnail'] ?? '')) : '';
            $courses[$key]['course_icon'] = valid_file($course['course_icon'] ?? '') ? base_url(get_file($course['course_icon'] ?? '')) : '';
            $courses[$key]['total_reviews'] = $this->review_model->get(['course_id' => $course['id']])->getNumRows();
            $courses[$key]['total_rating'] = $this->review_model->average_rating_by_course($course['id']);
            $enrollCount += $this->enrol_model->get(['course_id' => $course['id']])->getNumRows();
        }

        // Prepare response data
        $data = [
            'category_name' => $category['name'] ?? '',
            'category_description' => $category['description'] ?? '',
            'thumbnail' => valid_file($category['thumbnail']) ? base_url(get_file($category['thumbnail'])) : '',
            'video_url' => $category['video_url'] ?? '',
            'enroll_count' => $enrollCount,
            'courses' => $courses
        ];

        return $this->response->setJSON([
            'status' => 'success',
            'data' => $data
        ]);
    }

}
