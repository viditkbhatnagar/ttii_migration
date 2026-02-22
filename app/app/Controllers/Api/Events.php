<?php
//File: app/Controllers/Api/Home.php

namespace App\Controllers\Api;


use App\Controllers\Api\Api;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Events_model;
use App\Models\Event_registration_model;
use App\Models\Review_model;

class Events extends Api
{
    private $users_model;
    public function __construct(){
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->events_model = new Events_model();        
        $this->event_registration_model = new Event_registration_model();
        $this->review_model = new Review_model();

        
    }
    
    
    public function index()
    {
        $this->is_valid_request(['GET']);
        $userdata =$this->users_model->get(['id' => $this->user_id])->getRow();
        
        $filter = $this->request->getGet('filter');
        
   
        $events = $this->events_model->get_upcoming_events($this->user_id,$filter);
    
        $live_now = [];
        $upcoming = [];
        $expired = [];
        
        
        foreach ($events as $eve) {
            if (strpos($eve['status'], 'Live Now') !== false) {
                $live_now[] = $eve;
            }
            else if (strpos($eve['status'], 'Next Live') !== false) {
                $upcoming[] = $eve;
            }
            else {
                $expired[] = $eve;
            }
        }

        $data = [
                    'expired' => $expired,
                    'live' => $live_now,
                    'upcoming' => $upcoming
                ];
        
        
        $this->response_data = ['status' => 1,'message' => 'succesfully' , 'data' => $data];
        return $this->set_response();
    }
    
    
       /*** Event Details ***/
    public function get_event_details()
    {
        $this->is_valid_request(['GET']);
        
        $event_id = $this->request->getGet('event_id');

        // Get category details
        $event = $this->events_model->get(['id' => $event_id])->getRowArray();
        $event_data = [];
        
        if(!empty($event))
        {
            $event_data = $this->events_model->events_data($event,$this->user_id);
        }
        else
        {
            return $this->response->setJSON([
                'status' => 'error',
                'message' => 'Event not found'
            ]);
        }
        

        return $this->response->setJSON([
            'status' => 'success',
            'data' => $event_data
        ]);
    }
    
    
    public function register_event()
    {
        $this->is_valid_request(['POST']);
        
        $event_id = $this->request->getPost('event_id');

        $data = [
            'user_id' => $this->user_id,
            'name' => $this->request->getPost('name'),
            'phone' => $this->request->getPost('phone'),
            'event_id' => $this->request->getPost('event_id'),
            'attend_status' => $this->request->getPost('attend_status'),
            'created_by' => $this->user_id,
            'created_at' => date('Y-m-d H:i:s'),
        ];
        
		
        $user_check = $this->event_registration_model->get(['event_id' => $event_id, 'user_id' => $this->user_id]);
        
        if ($user_check->getNumRows() == 0)
        {
            
            $reg_id = $this->event_registration_model->add($data);
            // log_message('error',print_r(get_last_query(),true));
            
            if($reg_id > 0){ 
                $this->response_data = ['status' => 1,'message' => 'success' , 'data' => []];
            }else{
                $this->response_data = ['status' => false,'message' => 'Something Went Wrong' , 'data' => []];
            }
        }
        else
        {
            $this->response_data = ['status' => false,'message' => 'You are already registered..!' , 'data' => []];
        }
        
        return $this->set_response();
    }
    
    
    /*** Rating ***/
    public function add_feedback(){
        $this->is_valid_request(['GET']);
        $userdata = $this->users_model->get(['id' => $this->user_id])->getRow();
        $event_id  = $this->request->getGet('event_id');
        $rating     = $this->request->getGet('rating');
        $review     = $this->request->getGet('review');
        
        $exist = $this->review_model->get(['user_id' => $this->user_id, 'event_id' =>$event_id])->getNumRows();
        if($exist==0)
        {
           $insert_data = [
                    'rating'    => $rating,
                    'user_id'   => $this->user_id,
                    'event_id' => $event_id,
                    'review'    => $review,
                    'item_type'  => 2,
                    'created_by'=> $this->user_id,
                    'created_at' => date('Y-m-d H:i:s'),
                ];
        
            $rating_id = $this->review_model->add($insert_data);
            $this->response_data = ['status' => 1,'message' => 'succesfully' , 'data' => []];
        }
        else
        {
            $this->response_data = ['status' => 0,'message' => 'Already Exist' , 'data' => []];
        }
        
        return $this->set_response();
    }
    
    

    


}
