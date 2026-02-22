<?php namespace App\Models;

use CodeIgniter\Model;
use App\Models\Payment_model;
use App\Models\Users_model;
use App\Models\Course_model;
use App\Models\Event_registration_model;
use App\Models\Recorded_events_model;

class Events_model extends Base_model
{
    protected $table         = 'events';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Events';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
    
    // public function get_upcoming_events($user_id=null,$filter=null)
    // {
    //     $events = $this->get()->getResultArray();
        
    //     $event_data = [];
    //     foreach($events as $eve){
    //         $event_data[] = $this->events_data($eve,$user_id);
    //     }
    //     return $event_data;
    // }
    
    
    public function get_upcoming_events($user_id = null, $filter = null)
    {
        $where = [];
    
        if ($filter === 'weekly') 
        {
            $startOfWeek = date('Y-m-d', strtotime('last sunday midnight'));  // Start of current week (Sunday)
            $endOfWeek = date('Y-m-d', strtotime('next saturday 23:59'));    // End of current week (Saturday)
    
            $where['event_date >='] = $startOfWeek;
            $where['event_date <='] = $endOfWeek;
        } elseif ($filter === 'monthly') {
            $startOfMonth = date('Y-m-01');  // First day of the current month.
            $endOfMonth = date('Y-m-t');     // Last day of the current month.
    
            $where['event_date >='] = $startOfMonth;
            $where['event_date <='] = $endOfMonth;
        }
    
        $events = $this->get($where)->getResultArray();
    
        $event_data = [];
    
        foreach ($events as $eve) {
            $event_data[] = $this->events_data($eve, $user_id);
        }
    
        return $event_data;
    }

    public function event_with_date($date,$user_id)
    {
        $events =  $this->get(['event_date' => $date])->getResultArray();
        $event_data = [];
        foreach($events as $event){
            $event_data[] = $this->events_data($event, $user_id);
        }

        return $event_data;
    }


    
    
    
    public function events_data($eve,$user_id=null)
    {
        $this->users_model = new Users_model();
        $this->event_registration_model = new Event_registration_model();
        $this->recorded_events_model = new Recorded_events_model();

        
        
        $instructor = $this->users_model->get(['id' =>$eve['instructor_id']],['id','name','image'])->getRowArray();
         
        // $date_from = strtotime($eve["from_time"].$eve["to_time"]);
        // $date_to = strtotime($eve["event_date"].$eve["to_time"]);
        // $currentDate = date("Y-m-d");
        // $currentTime = date("H:i:s");
        // $date_now=strtotime($currentDate . $currentTime);
        // $time=$date_from-$date_now;
        // $time_a=$date_to-$date_now;
        // if ($time > 0)
        //     $status = "Next Event " . strftime('%d %B', strtotime($eve['event_date'])) . " " . date('h:i A', strtotime($eve["from_time"]));
        // else if ($time_a < 0)
        //     $status = "Expired";
        // else
        //     $status = "Live Now";

        $date_from = strtotime($eve["event_date"] . ' ' . $eve["from_time"]);
        $date_to   = strtotime($eve["event_date"] . ' ' . $eve["to_time"]);

        $currentDateTime = date("Y-m-d H:i:s");
        $date_now = strtotime($currentDateTime);

        // Time until event starts
        $time_until_start = $date_from - $date_now;

        // Time until event ends
        $time_until_end = $date_to - $date_now;

        if ($time_until_start > 0) {
            $status = "Next Event " . date('d F', strtotime($eve['event_date'])) . " " . date('h:i A', strtotime($eve["from_time"]));
        } elseif ($time_until_end < 0) {
            $status = "Expired";
        } else {
            $status = "Live Now";
        }

        $event_data = [
            'id' => $eve['id'] ?? '',
            'title' => $eve['title'] ?? '',
            'description' => $eve['description'] ?? '',
            'date' => date('d-m-Y',strtotime($eve['event_date'])) ?? '',
            'formatted_date' => date('d M Y',strtotime($eve['event_date'])) ?? '',
            'time' => date('h:i A', strtotime($eve["from_time"])) ." - ". date('h:i A', strtotime($eve["to_time"])),
            'image' => valid_file($eve['image']) ? base_url(get_file($eve['image'])) : base_url('uploads/dummy.jpg'),
            'objectives' => json_decode($eve['objectives']),
            'duration' => $eve['duration'],
            'recording_status' => ($eve['is_recording_available'] == 1) ? 'Available' : 'Not available',
            'recordings' => $this->recorded_events_model->get(['event_id' => $eve['id']],['id','title','video_url','duration','summary'])->getResultArray(),
            'status' => $status,
            'is_registered' => $this->event_registration_model->get(['user_id' => $user_id,'event_id' => $eve['id']])->getNumRows(),
            'instructor_name' => $instructor['name'] ?? '',
            'instructor_image' => valid_file($instructor['image']) ? base_url(get_file($instructor['image'])) : base_url('uploads/dummy.jpg'),

        ];
        return $event_data;
    }


}
