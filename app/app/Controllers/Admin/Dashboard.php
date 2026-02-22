<?php

namespace App\Controllers\Admin;
use App\Controllers\Admin\AppBaseController;

use App\Models\Users_model;
use App\Models\Category_model;
use App\Models\Course_model;
use App\Models\Live_class_model;
use App\Models\Enrol_model;
use App\Models\Exam_model;
use App\Models\Subject_model;
use App\Models\Lesson_model;
use App\Models\Lesson_file_model;
use App\Models\Payment_model;
use App\Models\Centres_model;
use App\Models\Cohorts_model;
use App\Models\Counsellor_target_model;
use App\Models\Associates_target_model;

class Dashboard extends AppBaseController
{
    private $users_model;
    private $category_model;
    private $course_model;
    private $live_class_model;
    private $enrol_model;
    private $exam_model;
    private $subject_model;
    private $lesson_model;
    private $lesson_file_model;
    private $cohorts_model;
    private $counsellor_target_model;
    private $associate_target_model;
    

    public function __construct()
    {
        parent::__construct();
        $this->users_model = new Users_model();
        $this->category_model = new Category_model();
        $this->course_model = new Course_model();
        $this->live_class_model = new Live_class_model();
        $this->enrol_model = new Enrol_model();
        $this->exam_model = new Exam_model();
        $this->subject_model = new Subject_model();
        $this->lesson_model = new Lesson_model();
        $this->lesson_file_model = new Lesson_file_model();
        $this->payment_model = new Payment_model();
        $this->centres_model = new Centres_model();
        $this->cohorts_model = new Cohorts_model();
        $this->counsellor_target_model = new Counsellor_target_model();
        $this->associate_target_model = new Associates_target_model();

    }

    public function index($date = null, $team = 'all')
    {
        if (is_counsellor()) {
            $this->counsellor_dashboard();
        }
        elseif(is_associate()){
            $this->associate_dashboard();
        }
        else{
            $this->data['number_of_students']    = $this->users_model->get(['role_id'=>2])->getNumRows();
            $this->data['number_of_instructors'] = $this->users_model->get(['role_id'=>3])->getNumRows();
            $this->data['number_of_category']    = $this->category_model->get()->getNumRows();
            $this->data['number_of_courses']     = $this->course_model->get()->getNumRows();
            $this->data['number_of_live_class']  = $this->live_class_model->get()->getNumRows();
            $this->data['number_of_enrolment']   = $this->enrol_model->get()->getNumRows();
            $this->data['number_of_payments']    = $this->payment_model->get()->getNumRows();
            $this->data['number_of_questions']   = $this->exam_model->get()->getNumRows();
            $this->data['number_of_subjects']    = $this->subject_model->get()->getNumRows();
            $this->data['number_of_lessons']     = $this->lesson_model->get()->getNumRows();
            $this->data['number_of_materials']   = $this->lesson_file_model->get(['attachment_type' => 'pdf'])->getNumRows();
            $this->data['number_of_videos']      = $this->lesson_file_model->get(['attachment_type' => 'url'])->getNumRows();
            $this->data['number_of_centres']      = $this->centres_model->get()->getNumRows();
            $this->data['number_of_cohorts']      = $this->cohorts_model->get()->getNumRows();

            $this->data['page_title'] = 'Dashboard';
            $this->data['page_name'] = 'Dashboard/index';

        }
        return view('Admin/index', $this->data);
    }
    


    public function counsellor_dashboard()
    {
        $current_date = date('Y-m-d');
        $user_id = get_user_id();

        /* ============================
        FETCH ACTIVE TARGET
        ============================ */
        $target = $this->counsellor_target_model->get(
            [
                'counsellor_id' => $user_id,
                'type' => 1,
                'from_date <=' => $current_date,
                'to_date >=' => $current_date
            ]
        )->getRowArray();

        $this->data['target_point'] = $target['value'] ?? 0;

        $from_date = $target['from_date'] ?? date('Y-m-01');
        $to_date   = $target['to_date'] ?? date('Y-m-t');

        /* ============================
        ACHIEVED POINTS (EXACT SAME AS index())
        ============================ */
        $achievedPoints = $this->users_model->get_join(
            [
                ['enrol', 'enrol.user_id = users.id'],
                ['course', 'course.id = enrol.course_id']
            ],
            [
                'enrol.pipeline_user' => $user_id,
                'enrol.enrollment_date >=' => $from_date,
                'enrol.enrollment_date <=' => $to_date
            ],
            ['course.point']
        )->getResultArray();

        $this->data['achievedPoints'] = array_sum(array_column($achievedPoints, 'point'));

        /* ============================
        ACHIEVEMENT %
        ============================ */
        $this->data['achievementPercentage'] = ($this->data['target_point'] > 0)
            ? round(($this->data['achievedPoints'] / $this->data['target_point']) * 100, 2)
            : 0;

        /* ============================
        ADMISSIONS COUNT (SAME RANGE)
        ============================ */
        $this->data['admissions_count'] = $this->users_model->get_join(
            [
                ['enrol', 'enrol.user_id = users.id']
            ],
            [
                'enrol.pipeline_user' => $user_id,
                'enrol.enrollment_date >=' => $from_date,
                'enrol.enrollment_date <=' => $to_date
            ]
        )->getNumRows();

        /* ============================
        YEARLY CHART DATA (UNCHANGED)
        ============================ */
        $current_year = date('Y');
        $achievedPointsData = array_fill(1, 12, 0);
        $targetPointsData   = array_fill(1, 12, 0);

        for ($month = 1; $month <= 12; $month++) {

            $month_start = date("Y-m-01", strtotime("$current_year-$month-01"));
            $month_end   = date("Y-m-t", strtotime("$current_year-$month-01"));

            // achieved
            $points = $this->users_model->get_join(
                [
                    ['enrol', 'enrol.user_id = users.id'],
                    ['course', 'course.id = enrol.course_id']
                ],
                [
                    'enrol.pipeline_user' => $user_id,
                    'enrol.enrollment_date >=' => $month_start,
                    'enrol.enrollment_date <=' => $month_end
                ],
                ['course.point']
            )->getResultArray();

            $achievedPointsData[$month] = array_sum(array_column($points, 'point'));

            // target
            $targetPoint = $this->counsellor_target_model->get(
                [
                    'counsellor_id' => $user_id,
                    'type' => 1,
                    'from_date <=' => $month_end,
                    'to_date >=' => $month_start
                ],
                ['value']
            )->getRowArray();

            $targetPointsData[$month] = $targetPoint['value'] ?? 0;
        }

        $this->data['achievedPointsChart'] = array_values($achievedPointsData);
        $this->data['targetPointsChart']   = array_values($targetPointsData);

        /* ============================
        PAGE INFO
        ================
        */


            $this->data['course_data'] = $this->course_model->get_join(
                [['enrol', 'enrol.course_id = course.id']],
                ['enrol.pipeline_user' => $user_id],
                ["DATE_FORMAT(course.created_at, '%Y-%m') as month, course.title, COUNT(course.id) as course_count"],
                ['month' => 'ASC'],
                null,
                ['month', 'course.title']
            )->getResultArray();



            // Student gender
            // $male_count = $this->users_model->get_join([['user_details', 'user_details.user_id = users.id']],['role_id' => 2, 'user_details.gender' => 'Male'])->getNumRows();
            // $female_count = $this->users_model->get(['role_id' => 2, 'gender' => 'Female'])->getNumRows();
            // $others_count = $this->users_model->get(['role_id' => 2, 'gender' => 'Others'])->getNumRows();

            $genderRows = $this->users_model->get_join(
                [ ['user_details', 'user_details.user_id = users.id']],
                ['users.role_id' => 2],
                ['user_details.gender','COUNT(users.id) AS total'],
                null,
                null,
                ['user_details.gender']
            )->getResultArray();

            // log_message('error', json_encode($genderRows));
            $male_count   = 0;
            $female_count = 0;
            $others_count = 0;

            foreach ($genderRows as $row) {
                if ($row['gender'] === 'Male') {
                    $male_count = $row['total'];
                } elseif ($row['gender'] === 'Female') {
                    $female_count = $row['total'];
                } else {
                    $others_count += $row['total'];
                }
            }


            $this->data['student_gender'] = [
                'Male'   => (int)$male_count,
                'Female' => (int)$female_count,
                'Others' => (int)$others_count,
            ];


            // log_message('error', json_encode($this->data['student_gender']));
            //university chart
            $this->data['university_data'] = [];


            $source_array = ['referral', 'website', 'social media', 'client', 'other'];

            $source_data = [];
            // foreach ($source_array as $source) {
            //     $source_data[$source] = $this->users_model->get(['source' => $source])->getNumRows();
            // }

            $this->data['source_data'] = $source_data;

            $this->data['source_colors'] = [
                'referral' => 'text-primary',
                'website' => 'text-warning',
                'social media' => 'text-info',
                'client' => 'text-success',
                'other' => 'text-danger'
            ];

            $this->data['chart_colors'] = [
                'referral' => '#007bff',
                'website' => '#ffc107',
                'social media' => '#17a2b8',
                'client' => '#28a745',
                'other' => '#dc3545'
            ];

            //Ranking Based on Point

            $counsellor_point_ranking = $this->users_model->get(['role_id' => 9], ['id', 'name', 'profile_picture'])->getResultArray();

            foreach ($counsellor_point_ranking as $key => $counsellor) {
                $where_counsellor = [
                    'enrol.pipeline_user' => $counsellor['id'],
                    'enrol.enrollment_date >=' => date('Y-m-01'),
                    'enrol.enrollment_date <=' => date('Y-m-t')
                ];

                $consAchievedPoints = $this->enrol_model->get_join(
                    [['course', 'course.id = enrol.course_id']],
                    $where_counsellor,
                    ['course.point']
                )->getResultArray();
                

                $counsellor_point_ranking[$key]['achievedPoints'] = array_sum(array_column($consAchievedPoints, 'point'));
            }
        
            usort($counsellor_point_ranking, function ($a, $b) {
                return $b['achievedPoints'] <=> $a['achievedPoints'];
            });

            $this->data['counsellor_point_ranking'] = $counsellor_point_ranking;


            //  log_message('error', json_encode($counsellor_point_ranking));

            //Ranking Based on Count

            $counsellors_count_ranking = $this->users_model->get(['role_id' => 9], ['id', 'name', 'profile_picture'])->getResultArray();

            foreach ($counsellors_count_ranking as $key => $counsellor) {
                $where_counsellor = [
                    'pipeline_user' => $counsellor['id'],
                    'enrollment_date >=' => date('Y-m-01'),
                    'enrollment_date <=' => date('Y-m-t')
                ];

                $counsellors_count_ranking[$key]['achievedCounts'] = $this->enrol_model->get($where_counsellor)->getNumRows();
            }

            usort($counsellors_count_ranking, function ($a, $b) {
                return $b['achievedCounts'] <=> $a['achievedCounts'];
            });

            $this->data['counsellors_count_ranking'] = $counsellors_count_ranking;

            // echo "<pre>";
            // print_r($counsellors_count_ranking);
            // exit;

            $this->data['page_title'] = 'Dashboard';
            $this->data['page_name'] = 'Dashboard/counsellor';
    }
    


    public function associate_dashboard()
    {
        $current_date = date('Y-m-d');
        $user_id = get_user_id();

        /* ============================
        FETCH ACTIVE TARGET
        ============================ */
        $target = $this->associate_target_model->get(
            [
                'associate_id' => $user_id,
                'type' => 1,
                'from_date <=' => $current_date,
                'to_date >=' => $current_date
            ]
        )->getRowArray();

        $this->data['target_point'] = $target['value'] ?? 0;

        $from_date = $target['from_date'] ?? date('Y-m-01');
        $to_date   = $target['to_date'] ?? date('Y-m-t');

        /* ============================
        ACHIEVED POINTS (EXACT SAME AS index())
        ============================ */
        $achievedPoints = $this->users_model->get_join(
            [
                ['enrol', 'enrol.user_id = users.id'],
                ['course', 'course.id = enrol.course_id']
            ],
            [
                'enrol.pipeline_user' => $user_id,
                'enrol.enrollment_date >=' => $from_date,
                'enrol.enrollment_date <=' => $to_date
            ],
            ['course.point']
        )->getResultArray();

        $this->data['achievedPoints'] = array_sum(array_column($achievedPoints, 'point'));

        /* ============================
        ACHIEVEMENT %
        ============================ */
        $this->data['achievementPercentage'] = ($this->data['target_point'] > 0)
            ? round(($this->data['achievedPoints'] / $this->data['target_point']) * 100, 2)
            : 0;

        /* ============================
        ADMISSIONS COUNT (SAME RANGE)
        ============================ */
        $this->data['admissions_count'] = $this->users_model->get_join(
            [
                ['enrol', 'enrol.user_id = users.id']
            ],
            [
                'enrol.pipeline_user' => $user_id,
                'enrol.enrollment_date >=' => $from_date,
                'enrol.enrollment_date <=' => $to_date
            ]
        )->getNumRows();

        /* ============================
        YEARLY CHART DATA (UNCHANGED)
        ============================ */
        $current_year = date('Y');
        $achievedPointsData = array_fill(1, 12, 0);
        $targetPointsData   = array_fill(1, 12, 0);

        for ($month = 1; $month <= 12; $month++) {

            $month_start = date("Y-m-01", strtotime("$current_year-$month-01"));
            $month_end   = date("Y-m-t", strtotime("$current_year-$month-01"));

            // achieved
            $points = $this->users_model->get_join(
                [
                    ['enrol', 'enrol.user_id = users.id'],
                    ['course', 'course.id = enrol.course_id']
                ],
                [
                    'enrol.pipeline_user' => $user_id,
                    'enrol.enrollment_date >=' => $month_start,
                    'enrol.enrollment_date <=' => $month_end
                ],
                ['course.point']
            )->getResultArray();

            $achievedPointsData[$month] = array_sum(array_column($points, 'point'));

            // target
            $targetPoint = $this->associate_target_model->get(
                [
                    'associate_id' => $user_id,
                    'type' => 1,
                    'from_date <=' => $month_end,
                    'to_date >=' => $month_start
                ],
                ['value']
            )->getRowArray();

            $targetPointsData[$month] = $targetPoint['value'] ?? 0;
        }

        $this->data['achievedPointsChart'] = array_values($achievedPointsData);
        $this->data['targetPointsChart']   = array_values($targetPointsData);

        /* ============================
        PAGE INFO
        ================
        */


            $this->data['course_data'] = $this->course_model->get_join(
                [['enrol', 'enrol.course_id = course.id']],
                ['enrol.pipeline_user' => $user_id],
                ["DATE_FORMAT(course.created_at, '%Y-%m') as month, course.title, COUNT(course.id) as course_count"],
                ['month' => 'ASC'],
                null,
                ['month', 'course.title']
            )->getResultArray();



            // Student gender
            // $male_count = $this->users_model->get_join([['user_details', 'user_details.user_id = users.id']],['role_id' => 2, 'user_details.gender' => 'Male'])->getNumRows();
            // $female_count = $this->users_model->get(['role_id' => 2, 'gender' => 'Female'])->getNumRows();
            // $others_count = $this->users_model->get(['role_id' => 2, 'gender' => 'Others'])->getNumRows();

            $genderRows = $this->users_model->get_join(
                [ ['user_details', 'user_details.user_id = users.id']],
                ['users.role_id' => 2],
                ['user_details.gender','COUNT(users.id) AS total'],
                null,
                null,
                ['user_details.gender']
            )->getResultArray();

            // log_message('error', json_encode($genderRows));
            $male_count   = 0;
            $female_count = 0;
            $others_count = 0;

            foreach ($genderRows as $row) {
                if ($row['gender'] === 'Male') {
                    $male_count = $row['total'];
                } elseif ($row['gender'] === 'Female') {
                    $female_count = $row['total'];
                } else {
                    $others_count += $row['total'];
                }
            }


            $this->data['student_gender'] = [
                'Male'   => (int)$male_count,
                'Female' => (int)$female_count,
                'Others' => (int)$others_count,
            ];


            // log_message('error', json_encode($this->data['student_gender']));
            //university chart
            $this->data['university_data'] = [];


            $source_array = ['referral', 'website', 'social media', 'client', 'other'];

            $source_data = [];
            // foreach ($source_array as $source) {
            //     $source_data[$source] = $this->users_model->get(['source' => $source])->getNumRows();
            // }

            $this->data['source_data'] = $source_data;

            $this->data['source_colors'] = [
                'referral' => 'text-primary',
                'website' => 'text-warning',
                'social media' => 'text-info',
                'client' => 'text-success',
                'other' => 'text-danger'
            ];

            $this->data['chart_colors'] = [
                'referral' => '#007bff',
                'website' => '#ffc107',
                'social media' => '#17a2b8',
                'client' => '#28a745',
                'other' => '#dc3545'
            ];

            //Ranking Based on Point

            $associate_point_ranking = $this->users_model->get(['role_id' => 10], ['id', 'name', 'profile_picture'])->getResultArray();

            foreach ($associate_point_ranking as $key => $associate) {
                $where_associate = [
                    'enrol.pipeline_user' => $associate['id'],
                    'enrol.enrollment_date >=' => date('Y-m-01'),
                    'enrol.enrollment_date <=' => date('Y-m-t')
                ];

                $consAchievedPoints = $this->enrol_model->get_join(
                    [['course', 'course.id = enrol.course_id']],
                    $where_associate,
                    ['course.point']
                )->getResultArray();
                

                $associate_point_ranking[$key]['achievedPoints'] = array_sum(array_column($consAchievedPoints, 'point'));
            }
        
            usort($associate_point_ranking, function ($a, $b) {
                return $b['achievedPoints'] <=> $a['achievedPoints'];
            });

            $this->data['associate_point_ranking'] = $associate_point_ranking;


            //  log_message('error', json_encode($counsellor_point_ranking));

            //Ranking Based on Count

            $associate_count_ranking = $this->users_model->get(['role_id' => 10], ['id', 'name', 'profile_picture'])->getResultArray();

            foreach ($associate_count_ranking as $key => $associate) {
                $where_associate = [
                    'pipeline_user' => $associate['id'],
                    'enrollment_date >=' => date('Y-m-01'),
                    'enrollment_date <=' => date('Y-m-t')
                ];

                $associate_count_ranking[$key]['achievedCounts'] = $this->enrol_model->get($where_associate)->getNumRows();
            }

            usort($associate_count_ranking, function ($a, $b) {
                return $b['achievedCounts'] <=> $a['achievedCounts'];
            });

            $this->data['associate_count_ranking'] = $associate_count_ranking;

            // echo "<pre>";
            // print_r($counsellors_count_ranking);
            // exit;

            $this->data['page_title'] = 'Dashboard';
            $this->data['page_name'] = 'Dashboard/associate';
    }
    
}
