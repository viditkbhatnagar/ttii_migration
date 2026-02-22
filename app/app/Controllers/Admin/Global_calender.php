<?php
namespace App\Controllers\Admin;
use App\Models\Exam_model;
use App\Models\Live_class_model;

class Global_calender extends AppBaseController
{
    private $exam_model;
    private $live_class_model;


    public function __construct()
    {
        parent::__construct();
        $this->exam_model = new Exam_model();
        $this->live_class_model = new Live_class_model();
    }

    public function index()
    {
        $exams = $this->exam_model->get()->getResultArray();
        $liveClasses = $this->live_class_model->get()->getResultArray();
        
        $examEvents = [];
        $liveEvents = [];
        
       foreach ($exams as $exam) {
            $examEvents[] = [
                'id' => 'exam_' . $exam['id'],
                'title' => $exam['title'],
                'start' => $exam['from_date'] . 'T' . $exam['from_time'], 
                'end' => $exam['to_date'] . 'T' . $exam['to_time'],
                'type' => 'Exam'
            ];
        }
        
        foreach ($liveClasses as $class) {
            $liveEvents[] = [
                'id' => 'live_' . $class['id'],
                'title' => $class['title'],
                'start' => $class['date'] . 'T' . $class['fromTime'], 
                'end' => $class['date'] . 'T' . $class['toTime'],
                'type' => 'Live Class'
            ];
        }

        // Merge both event types
        $allEvents = array_merge($examEvents,$liveEvents);
        
        $this->data['events'] = json_encode($allEvents);
        $this->data['page_title'] = 'Global Calender';
        $this->data['page_name'] = 'Global_calender/index';
        
        return view('Admin/index', $this->data);
    }
    
}
