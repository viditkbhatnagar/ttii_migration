<?php
//File: app/Controllers/Api/Home.php

namespace App\Controllers\Api;

use App\Controllers\Api\Api;
use App\Models\Habit_category_model;
use App\Models\User_goals_model;
use App\Models\User_goals_activity_model;

class User_goals extends Api
{
    private $habit_category_model;
    private $user_goals_model;
    private $user_goals_activity_model;
    public function __construct(){
        $this->habit_category_model = new Habit_category_model();
        $this->user_goals_model = new User_goals_model();
        $this->user_goals_activity_model = new User_goals_activity_model();
    }
    
    /*** Category List ***/
    public function habit_catogories()
    {
        $this->is_valid_request(['GET']);
        $categories = $this->habit_category_model->get()->getResultArray();
        $category_data = [];
        foreach($categories as $key => $category){
            $category_data[$key]['id'] = $category['id'];
            $category_data[$key]['title'] = $category['title'] ?? '';
            $category_data[$key]['icon'] = valid_file($category['icon']) ? base_url(get_file($category['icon'])) : '';
        }
        
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $category_data];
        return $this->set_response();
    }
    
    /* User Goals*/
    public function my_goals()
    {
        $this->is_valid_request(['GET']);
        $goals = $this->user_goals_model->get(['user_id' => $this->user_id])->getResultArray();
        
        $user_goals = [];
        foreach($goals as $key => $goal){
            $category = $this->habit_category_model->get(['id' => $goal['habit_category_id']])->getRow();
            $user_goals[$key]['id'] = $goal['id'];
            $user_goals[$key]['title'] = $goal['title'] ?? '';
            $user_goals[$key]['description'] = $goal['description'] ?? '';
            $user_goals[$key]['time_period'] = $goal['time_period'] ?? '';
            $user_goals[$key]['start_date'] = $goal['start_date'] ? date('d-m-Y', strtotime($goal['start_date'])) : '';
            $user_goals[$key]['end_date'] = $goal['end_date'] ? date('d-m-Y', strtotime($goal['end_date'])) : '';
            
            $start_date = strtotime($goal['start_date']);
            $end_date = strtotime($goal['end_date']);
            
            // Calculate the difference in seconds, then convert to days
            $total_days = ($end_date - $start_date) / (60 * 60 * 24) + 1; // Adding 1 to include both dates
            $completed_days = $this->user_goals_activity_model->get(['goal_id' => $goal['id'], 'user_id' => $this->user_id])->getNumRows();

            $user_goals[$key]['category_name'] = $category->title ?? '';
            $user_goals[$key]['category_icon'] = valid_file($category->icon) ? base_url(get_file($category->icon)) : '';
            $user_goals[$key]['total_days'] = $total_days;
            $user_goals[$key]['completed_days'] = $completed_days;
            $user_goals[$key]['progress'] = $total_days >0 ? round($completed_days/$total_days * 100) : 0;
        }
        
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $user_goals];
        return $this->set_response();
    }
    
    public function create_goal()
    {
        $this->is_valid_request(['GET']);
        
        $start_date = $this->request->getGet('start_date');
        $end_date   = $this->request->getGet('end_date');
        
        $data['title']      = $this->request->getGet('title');
        $data['user_id']    = $this->user_id;
        $data['habit_category_id'] = $this->request->getGet('habit_category_id');
        $data['description']= $this->request->getGet('description');
        $data['time_period']= $this->request->getGet('time_period');

        $data['start_date'] = $this->request->getGet('start_date') ? \DateTime::createFromFormat('d/m/Y', $this->request->getGet('start_date'))->format('Y-m-d') : '';
        $data['end_date'] = $this->request->getGet('end_date') ? \DateTime::createFromFormat('d/m/Y', $this->request->getGet('end_date'))->format('Y-m-d') : '';

        
        
        $data['created_by'] = $this->user_id;
        $data['created_at'] = date('Y-m-d H:i:s');

        $this->user_goals_model->add($data);
        
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => []];
        return $this->set_response();
    }
    
    public function update_goal()
    {
        $this->is_valid_request(['GET']);
        $id = $this->request->getGet('id');
        
        $data['title']       = $this->request->getGet('title');
        $data['description'] = $this->request->getGet('description');
        $data['time_period'] = $this->request->getGet('time_period');
        $data['start_date']  = $this->request->getGet('start_date') ? \DateTime::createFromFormat('d/m/Y', $this->request->getGet('start_date'))->format('Y-m-d') : '';
        $data['end_date']    = $this->request->getGet('end_date') ? \DateTime::createFromFormat('d/m/Y', $this->request->getGet('end_date'))->format('Y-m-d') : '';
        $data['updated_at']  = date('Y-m-d H:i:s');
        $data['updated_by']  = $this->user_id;
        
        $logger = service('logger');
        $logger->error('Database Error: ' . print_r($data,true));
        $this->user_goals_model->edit($data, ['id' => $id]);
        
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => []];
        return $this->set_response();
    }
    
    public function delete_goal()
    {
        $this->is_valid_request(['GET']);
        $id = $this->request->getGet('id');
        
        $this->user_goals_model->remove(['id' => $id]);
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => []];
        return $this->set_response();
    }
    
    public function goal_details()
    {
        $this->is_valid_request(['GET']);
        
        $goal_id = $this->request->getGet('goal_id');
        $data = $this->user_goals_activity_model->get_goal_details($goal_id, $this->user_id);
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $data];
        return $this->set_response();
    }
    
    public function mark_my_goal()
    {
        $this->is_valid_request(['GET']);
        $goal_id = $this->request->getGet('goal_id');
        $already_marked = $this->user_goals_activity_model->get(['goal_id' => $goal_id, 'user_id' => $this->user_id, 'date' => date('Y-m-d')])->getNumRows();
        $logger = service('logger');
        $logger->error('Database Error: ' . db_connect()->getLastQuery());
        if($already_marked == 0){
            $data = [
                'goal_id'    => $goal_id,
                'user_id'    => $this->user_id,
                'date'       => date('Y-m-d'),
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => $this->user_id,
                'updated_at' => date('Y-m-d H:i:s'),
                'updated_by' => $this->user_id
            ];
            
            $this->user_goals_activity_model->add($data);
            $this->response_data = ['status' => 1, 'message' => 'success', 'data' => []];
        }else{
            $this->response_data = ['status' => 0, 'message' => 'Already marked', 'data' => []];
        }
        
        return $this->set_response();
    }
    
    
    
    public function mark_goal_bulk()
    {
        $this->is_valid_request(['GET']);
        $goal_ids = json_decode($this->request->getGet('goal_ids'));

        foreach($goal_ids as $goal_id){
            $already_marked = $this->user_goals_activity_model->get(['goal_id' => $goal_id, 'user_id' => $this->user_id, 'date' => date('Y-m-d')])->getNumRows();

            if($already_marked == 0){
                $data = [
                    'goal_id'    => $goal_id,
                    'user_id'    => $this->user_id,
                    'date'       => date('Y-m-d'),
                    'created_at' => date('Y-m-d H:i:s'),
                    'created_by' => $this->user_id,
                    'updated_at' => date('Y-m-d H:i:s'),
                    'updated_by' => $this->user_id
                ];
                
                $this->user_goals_activity_model->add($data);
                
            }
        }
        
        $this->response_data = ['status' => 1, 'message' => 'success', 'data' => []];
        return $this->set_response();
    }

}
