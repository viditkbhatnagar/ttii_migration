<?php

namespace App\Controllers\Centre;

// use App\Controllers\App\CentreBaseController;
// use App\Models\Lead_status_model;
// use App\Models\Lead_source_model;
// use App\Models\Leads_model;
// use App\Models\Country_model;
// use App\Models\Course_model;
// use App\Models\University_model;
use App\Models\Users_model;
use App\Models\Centres_model;
use App\Models\Cohorts_model;
use App\Models\Applications_model;
// use App\Models\Sessions_model;
// use App\Models\Demo_sessions_model;
// use App\Models\Payment_model;
// use App\Models\Consultant_target_model;
// use App\Models\Students_model;

class Dashboard extends CentreBaseController
{
    // private $lead_status_model;
    // private $lead_source_model;
    // private $leads_model;
    // private $country_model;
    // private $university_model;
    private $users_model;
    private $centres_model;
    private $cohorts_model;
    private $applications_model;
    // private $sessions_model;
    // private $demo_sessions_model;
    // private $payment_model;
    public function __construct()
    {
        parent::__construct();
        // $this->lead_status_model = new Lead_status_model();
        // $this->lead_source_model = new Lead_source_model();
        // $this->leads_model = new Leads_model();
        // $this->country_model = new Country_model();
        // $this->course_model = new Course_model();
        // $this->university_model = new University_model();
        $this->users_model = new Users_model();
        $this->centres_model = new Centres_model();
        $this->cohorts_model = new Cohorts_model();
        $this->applications_model = new Applications_model();
        // $this->sessions_model = new Sessions_model();
        // $this->demo_sessions_model = new Demo_sessions_model();
        // $this->payment_model = new Payment_model();
        // $this->consultant_target_model = new Consultant_target_model();
        // $this->students_model = new Students_model();
    }

    public function index()
    {   
        $centre_id = $this->users_model->get(['id' => get_user_id()])->getRow()->centre_id ?? 0;
        $this->data['students'] = $this->users_model->get(['role_id' => 2,'added_under_centre' => $centre_id])->getNumRows();

        $this->data['wallet_balance'] = $this->centres_model->get(['id' => $centre_id])->getRow()->wallet_balance ?? 0;
        
        $this->data['active_cohorts'] = $this->cohorts_model->get(['centre_id' => $centre_id])->getNumRows() ?? 0;

        $this->data['pending_applications'] = $this->applications_model->get(['added_under_centre' => $centre_id,'is_converted' => 0])->getNumRows() ?? 0;

        $this->data['recent_students'] = $this->users_model->get_join([['course', 'course.id = users.course_id']],['added_under_centre' => $centre_id],
                                ['users.name as student_name','course.title as course_name','users.created_at as enrollment_date'],
                                ['users.created_at' => 'DESC'],3)->getResultArray() ?? [];

            log_message('error', print_r($this->data['recent_students'], true));
        $this->data['page_title'] = 'Dashboard';
        $this->data['page_name'] = 'Dashboard/index';

        return view('Centre/index', $this->data);
    }
}
