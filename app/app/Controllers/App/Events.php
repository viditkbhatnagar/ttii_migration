<?php

namespace App\Controllers\App;

use App\Controllers\App\UserBaseController;
use App\Models\Events_model;
use App\Models\Users_model;


class Events extends UserBaseController
{
    private $events_model;
    private $users_model;

    public function __construct()
    {
        parent::__construct();
        $this->events_model = new Events_model();
        $this->users_model = new Users_model();
    }

    public function index()
    {
        helper('text');
    
        $events = $this->events_model->get()->getResultArray() ?? [];
    
        $upcomingEvents = [];
        $completedEvents = [];
    
        $today = date('Y-m-d');
    
        foreach ($events as &$event) {
            $event['image'] = $this->getImageUrl($event['image'], 'ttiiteacher.png');
    
            $event['instructor'] = $this->getInstructorInfo($event['instructor_id']);
    
            $event['event_date'] = $this->formatDate($event['event_date'], 'd/m/y');
            $event['from_time'] = $this->formatDate($event['from_time'], 'h:i A');
            $event['to_time'] = $this->formatDate($event['to_time'], 'h:i A');
    
            $eventDate = \DateTime::createFromFormat('d/m/y', $event['event_date']);
            $eventDateFormatted = $eventDate ? $eventDate->format('Y-m-d') : null;
    
            if ($eventDateFormatted && $eventDateFormatted >= $today) {
                $upcomingEvents[] = $event;
            } else {
                $completedEvents[] = $event;
            }
        }
    
        $this->data = [
            'page_title' => 'Events',
            'page_name' => 'Events/index',
            'upcomingEvents' => $upcomingEvents,
            'completedEvents' => $completedEvents
        ];
    
        return view('App/index', $this->data);
    }
    public function event_details()
    {
        
    
        $this->data = [
            'page_title' => 'Event Details',
            'page_name' => 'Events/event_details',
        ];
    
        return view('App/index', $this->data);
    }
    
    private function getImageUrl($path, $default)
    {
        return valid_file($path)
            ? base_url(get_file($path))
            : base_url("assets/app/images/lmsdashboardcards/{$default}");
    }
    
    private function getInstructorInfo($id)
    {
        $instructor = $this->users_model
            ->get(['id' => $id], ['name', 'profile_picture'])
            ->getRowArray();
    
        if (!$instructor) {
            return [
                'name' => 'Unknown Instructor',
                'profile_picture' => base_url().'assets/app/images/lmsdashboardcards/ttiiteacher2.png'
            ];
        }
    
        $instructor['profile_picture'] = $this->getImageUrl(
            $instructor['profile_picture'],
            'ttiiteacher2.png'
        );
    
        return $instructor;
    }
    
    private function formatDate($date, $format)
    {
        return !empty($date) ? date($format, strtotime($date)) : '';
    }

    
    public function details($id){
        
        $this->data['events'] = $this->events_model->get(['id' => $id])->getRowArray();
        $instructor = $this->users_model->get(['id' =>  $this->data['events']['instructor_id']], ['name', 'profile_picture'])->getRowArray();

        if ($instructor) {
            $this->data['events']['instructor'] = $instructor;
            $this->data['events']['instructor']['profile_picture'] = valid_file($instructor['profile_picture']) ? base_url(get_file($instructor['profile_picture'])) : base_url() . 'assets/app/images/lmsdashboardcards/ttiiteacher2.png';
        } else {
            $this->data['events']['instructor'] = [
                'name' => 'Unknown Instructor',
                'profile_picture' => base_url() . 'assets/app/images/lmsdashboardcards/ttiiteacher2.png'
            ];
        }
        // echo "<pre>"; print_r($this->data); die();
        $this->data['page_title'] = 'Events';
        $this->data['page_name'] = 'Events/details';
        return view('App/index', $this->data);
    }
}