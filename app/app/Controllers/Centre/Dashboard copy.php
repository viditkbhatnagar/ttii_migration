<?php

namespace App\Controllers\Centre;

// use App\Controllers\App\CentreBaseController;
// use App\Models\Lead_status_model;
// use App\Models\Lead_source_model;
// use App\Models\Leads_model;
// use App\Models\Country_model;
// use App\Models\Course_model;
// use App\Models\University_model;
// use App\Models\Users_model;
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
    // private $users_model;
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
        // $this->users_model = new Users_model();
        // $this->sessions_model = new Sessions_model();
        // $this->demo_sessions_model = new Demo_sessions_model();
        // $this->payment_model = new Payment_model();
        // $this->consultant_target_model = new Consultant_target_model();
        // $this->students_model = new Students_model();
    }

    public function index()
    {
         // Create or get the data for charts
    $achievedPointsChart = 120; // or fetch from database
    $targetPointsChart = 150;   // or fetch from database

    // Pass them to view
    $this->data=[
        'achievedPointsChart' => $achievedPointsChart,
        'targetPointsChart' => $targetPointsChart
    ];
        $this->data['page_title'] = 'Dashboard';
        $this->data['page_name'] = 'Dashboard/index';
        return view('Centre/index', $this->data);
    }


    // public function consultant_dashboard()
    // {
    //     $current_date = date('Y-m-d');
    //     $user_id = get_user_id();

    //     // Fetch target value
    //     $target_point = $this->consultant_target_model->get(
    //         ['consultant_id' => $user_id, 'type' => 1, 'from_date <=' => $current_date, 'to_date >=' => $current_date],
    //         ['value']
    //     )->getRowArray();

    //     $this->data['target_point'] = $target_point['value'] ?? 0;

    //     // Fetch achieved points for the current month
    //     $current_month_start = date('Y-m-01');
    //     $current_month_end = date('Y-m-t');

    //     $where_current_month = [
    //         'students.consultant_id' => $user_id,
    //         'students.enrollment_date >=' => $current_month_start,
    //         'students.enrollment_date <=' => $current_month_end
    //     ];

    //     $achievedPoints = $this->students_model->get_join(
    //         [['specialisations', 'specialisations.course_id = students.course_id']],
    //         $where_current_month,
    //         ['specialisations.point']
    //     )->getResultArray();

    //     $this->data['achievedPoints'] = array_sum(array_column($achievedPoints, 'point'));

    //     // Calculate achievement percentage
    //     $this->data['achievementPercentage'] = ($this->data['target_point'] > 0)
    //         ? round(($this->data['achievedPoints'] / $this->data['target_point']) * 100, 2)
    //         : 0;

    //     // Fetch admissions count
    //     $this->data['admissions_count'] = $this->students_model->get($where_current_month)->getNumRows();

    //     // Fetch yearly data for achieved and target points
    //     $current_year = date('Y');
    //     $achievedPointsData = array_fill(1, 12, 0);
    //     $targetPointsData = array_fill(1, 12, 0);

    //     for ($month = 1; $month <= 12; $month++) {
    //         $month_start = date("Y-m-01", strtotime("$current_year-$month-01"));
    //         $month_end = date("Y-m-t", strtotime("$current_year-$month-01"));

    //         $where_monthly = [
    //             'students.consultant_id' => $user_id,
    //             'students.enrollment_date >=' => $month_start,
    //             'students.enrollment_date <=' => $month_end
    //         ];

    //         // Fetch achieved points for the month
    //         $achievedPoints = $this->students_model->get_join(
    //             [['specialisations', 'specialisations.course_id = students.course_id']],
    //             $where_monthly,
    //             ['specialisations.point']
    //         )->getResultArray();

    //         $achievedPointsData[$month] = array_sum(array_column($achievedPoints, 'point'));

    //         // Fetch target points for the month
    //         $targetPoint = $this->consultant_target_model->get(
    //             [
    //                 'consultant_id' => $user_id,
    //                 'type' => 1,
    //                 'from_date <=' => $month_end,
    //                 'to_date >=' => $month_start
    //             ],
    //             ['value']
    //         )->getRowArray();

    //         $targetPointsData[$month] = $targetPoint['value'] ?? 0;
    //     }

    //     // Assign chart data
    //     $this->data['achievedPointsChart'] = array_values($achievedPointsData);
    //     $this->data['targetPointsChart'] = array_values($targetPointsData);


    //     $this->data['course_data'] = $this->course_model->get_join(
    //         [['students', 'students.course_id = course.id']],
    //         ['students.consultant_id' => $user_id],
    //         ["DATE_FORMAT(course.created_at, '%Y-%m') as month, course.title, COUNT(course.id) as course_count"],
    //         ['month' => 'ASC'],
    //         null,
    //         ['month', 'course.title']
    //     )->getResultArray();


    //     // Student gender
    //     $male_count = $this->users_model->get(['role_id' => 4, 'gender' => 'Male'])->getNumRows();
    //     $female_count = $this->users_model->get(['role_id' => 4, 'gender' => 'Female'])->getNumRows();
    //     $others_count = $this->users_model->get(['role_id' => 4, 'gender' => 'Others'])->getNumRows();

    //     $this->data['student_gender'] = [
    //         'Male' => $male_count,
    //         'Female' => $female_count,
    //         'Others' => $others_count,
    //     ];

    //     //university chart
    //     $this->data['university_data'] = $this->university_model->get_join(
    //         [
    //             ['countries', 'countries.country_id = university.country_id']
    //         ],
    //         [],
    //         ['countries.country', 'COUNT(university.id) as university_count'],
    //         null,
    //         null,
    //         'countries.country_id'
    //     )->getResultArray();


    //     $source_array = ['referral', 'website', 'social media', 'client', 'other'];

    //     $source_data = [];
    //     foreach ($source_array as $source) {
    //         $source_data[$source] = $this->students_model->get(['source' => $source])->getNumRows();
    //     }

    //     $this->data['source_data'] = $source_data;

    //     $this->data['source_colors'] = [
    //         'referral' => 'text-primary',
    //         'website' => 'text-warning',
    //         'social media' => 'text-info',
    //         'client' => 'text-success',
    //         'other' => 'text-danger'
    //     ];

    //     $this->data['chart_colors'] = [
    //         'referral' => '#007bff',
    //         'website' => '#ffc107',
    //         'social media' => '#17a2b8',
    //         'client' => '#28a745',
    //         'other' => '#dc3545'
    //     ];

    //     //Ranking Based on Point

    //     $consultants_point_ranking = $this->users_model->get(['role_id' => 6], ['id', 'name', 'profile_picture'])->getResultArray();

    //     foreach ($consultants_point_ranking as $key => $consultant) {
    //         $where_consultant = [
    //             'students.consultant_id' => $consultant['id'],
    //             'students.enrollment_date >=' => date('Y-m-01'),
    //             'students.enrollment_date <=' => date('Y-m-t')
    //         ];

    //         $consAchievedPoints = $this->students_model->get_join(
    //             [['specialisations', 'specialisations.course_id = students.course_id']],
    //             $where_consultant,
    //             ['specialisations.point']
    //         )->getResultArray();

    //         $consultants_point_ranking[$key]['achievedPoints'] = array_sum(array_column($consAchievedPoints, 'point'));
    //     }

    //     usort($consultants_point_ranking, function ($a, $b) {
    //         return $b['achievedPoints'] <=> $a['achievedPoints'];
    //     });
        
    //     $this->data['consultants_point_ranking'] = $consultants_point_ranking;

    //     //Ranking Based on Count

    //     $consultants_count_ranking = $this->users_model->get(['role_id' => 6], ['id', 'name', 'profile_picture'])->getResultArray();

    //     foreach ($consultants_count_ranking as $key => $consultant) {
    //         $where_consultant = [
    //             'students.consultant_id' => $consultant['id'],
    //             'students.enrollment_date >=' => date('Y-m-01'),
    //             'students.enrollment_date <=' => date('Y-m-t')
    //         ];

    //         $consultants_count_ranking[$key]['achievedCounts'] = $this->students_model->get($where_consultant)->getNumRows();
    //     }

    //     usort($consultants_count_ranking, function ($a, $b) {
    //         return $b['achievedCounts'] <=> $a['achievedCounts'];
    //     });
        
    //     $this->data['consultants_count_ranking'] = $consultants_count_ranking;
        
    //     // echo "<pre>";
    //     // print_r($consultants_count_ranking);
    //     // exit;

    //     $this->data['page_title'] = 'Dashboard';
    //     $this->data['page_name'] = 'Dashboard/consultant';
    // }
}
