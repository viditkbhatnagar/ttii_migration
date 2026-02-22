<?php
//File: app/Controllers/Api/Home.php

namespace App\Controllers\Api;

use \Firebase\JWT\JWT;

use App\Controllers\Api\Api;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Live_class_model;
use App\Models\Cohort_students_model;
use App\Models\Subject_model;

class Live_class extends Api
{
    private $users_model;
    public function __construct(){
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->live_class_model = new Live_class_model();
        $this->cohort_students_model = new Cohort_students_model();
        $this->subject_model = new Subject_model();
    }
    
    
    public function index()
    {
        $this->is_valid_request(['GET']);
        $userdata =$this->users_model->get(['id' => $this->user_id])->getRow();

        $subject_id = $this->request->getGet('subect_id');



        ////////////////////////////////----------------------------------------------------------------////////////////////////////////////



        //old if() part - commented - 04-12-25

        // if(!empty($subject_id)){

        //     $subject_data = $this->subject_model->get(['id' => $subject_id])->getRowArray();
        //     log_message('error', print_r($subject_data,true));
        //     $subject_id = isset($subject_data['id']) && isset($subject_data['master_subject_id']) ? $subject_data['master_subject_id'] : $subject_id;
        
        //     $cohort = $this->cohort_students_model->get_join([
        //                                                 ['cohorts','cohorts.id = cohort_students.cohort_id'],
        //                                             ],
        //                                             ['user_id' => $this->user_id,'cohorts.subject_id' => $subject_id],
        //                                             [   'cohort_students.cohort_id as cohort_id',
        //                                                 'cohorts.title as cohort_title',
        //                                                 'cohorts.cohort_id as cohort_code',
        //                                                 'cohorts.start_date as cohort_start_date',
        //                                                 'cohorts.end_date as cohort_end_date',
        //                                             ])->getRowArray();

        //     // $live_classes = $this->live_class_model->get(   
        //     //                                                 ['cohort_id' => $cohort['cohort_id']],
        //     //                                                 ['id','session_id','title','date','fromTime','toTime']
        //     //                                             )->getResultArray();

        //     log_message('error', $cohort['cohort_id']);
        //     $live_classes = $this->live_class_model->get_live_classes_by_cohort($this->user_id,null,null,$cohort['cohort_id']);
            
            
            
        //     $live_now = [];
        //     $upcoming = [];
        //     $expired = [];
            
            
        //     foreach ($live_classes as $live_class) {
        //         if (strpos($live_class['status'], 'Live Now') !== false) {
        //             $live_now[] = $live_class;
        //         }
        //         else if (strpos($live_class['status'], 'Next Live') !== false) {
        //             $upcoming[] = $live_class;
        //         }
        //         else {
        //             $expired[] = $live_class;
        //         }
        //     }

        //     $data = [
        //                 'expired' => $expired,
        //                 'live' => $live_now,
        //                 'upcoming' => $upcoming
        //             ];
            
            
        //     $this->response_data = ['status' => 1,'message' => 'succesfully' , 'data' => $data];
        //     return $this->set_response();
        // }


        ////////////////////////////////----------------------------------------------------------------////////////////////////////////////




        if(!empty($subject_id)){

            $subject_data = $this->subject_model->get(['id' => $subject_id])->getRowArray();
            log_message('error', print_r($subject_data,true));
            
            // Get the master_subject_id of the requested subject
            $master_subject_id = !empty($subject_data['master_subject_id']) 
                ? $subject_data['master_subject_id'] 
                : $subject_id;
            
            log_message('error', 'Looking for cohorts with master_subject_id: ' . $master_subject_id);
            
            // Get all user's cohorts
            $user_cohorts = $this->cohort_students_model->get_join([
                                                        ['cohorts','cohorts.id = cohort_students.cohort_id'],
                                                    ],
                                                    ['user_id' => $this->user_id],
                                                    [   
                                                        'cohort_students.cohort_id as cohort_id',
                                                        'cohorts.title as cohort_title',
                                                        'cohorts.cohort_id as cohort_code',
                                                        'cohorts.start_date as cohort_start_date',
                                                        'cohorts.end_date as cohort_end_date',
                                                        'cohorts.subject_id as cohort_subject_id',
                                                    ])->getResultArray();
            
            $cohort = null;
            
            // Check each cohort to see if its subject matches the master_subject_id
            foreach($user_cohorts as $user_cohort){
                $cohort_subject = $this->subject_model->get(['id' => $user_cohort['cohort_subject_id']], ['id', 'master_subject_id'])->getRowArray();
                
                $cohort_master_id = !empty($cohort_subject['master_subject_id']) 
                    ? $cohort_subject['master_subject_id'] 
                    : $cohort_subject['id'];
                
                log_message('error', 'Checking cohort subject_id: ' . $user_cohort['cohort_subject_id'] . ' with master_id: ' . $cohort_master_id);
                
                if($cohort_master_id == $master_subject_id){
                    $cohort = $user_cohort;
                    log_message('error', 'Found matching cohort!');
                    break;
                }
            }

            if(!empty($cohort)){
                log_message('error', 'Using cohort_id: ' . $cohort['cohort_id']);
                $live_classes = $this->live_class_model->get_live_classes_by_cohort($this->user_id,null,null,$cohort['cohort_id']);
            } else {
                log_message('error', 'No cohort found for user with master_subject_id: ' . $master_subject_id);
                $live_classes = [];
            }


            
            
            
            $live_now = [];
            $upcoming = [];
            $expired = [];
            
            
            foreach ($live_classes as $live_class) {
                if (strpos($live_class['status'], 'Live Now') !== false) {
                    $live_now[] = $live_class;
                }
                else if (strpos($live_class['status'], 'Next Live') !== false) {
                    $upcoming[] = $live_class;
                }
                else {
                    $expired[] = $live_class;
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
        else{
            $cohort = $this->cohort_students_model->get_join([
                                                            ['cohorts','cohorts.id = cohort_students.cohort_id'],
                                                        ],
                                                        ['user_id' => $this->user_id],
                                                        [   'cohort_students.cohort_id as cohort_id',
                                                            'cohorts.title as cohort_title',
                                                            'cohorts.cohort_id as cohort_code',
                                                            'cohorts.start_date as cohort_start_date',
                                                            'cohorts.end_date as cohort_end_date',
                                                        ])->getResultArray(); //before : rowarray


                                               // log_message('error', print_r($cohort,true));
                                                 $cohort_ids = array_column($cohort, 'cohort_id');  //new 





            // $live_classes = $this->live_class_model->get(   
            //                                                 ['cohort_id' => $cohort['cohort_id']],
            //                                                 ['id','session_id','title','date','fromTime','toTime']
            //                                             )->getResultArray();

                        // $live_classes = $this->live_class_model->get_live_classes_by_cohort($this->user_id,null,null,$cohort['cohort_id']); //(by_cohort)
                         $live_classes = $this->live_class_model->get_live_classes($this->user_id,null,null,$cohort_ids); // before $cohort['cohort_id']
            //log_message('error', $cohort['cohort_id']);
            
            $live_now = [];
            $upcoming = [];
            $expired = [];
            
            
            foreach ($live_classes as $live_class) {
                if (strpos($live_class['status'], 'Live Now') !== false) {
                    $live_now[] = $live_class;
                }
                else if (strpos($live_class['status'], 'Next Live') !== false) {
                    $upcoming[] = $live_class;
                }
                else {
                    $expired[] = $live_class;
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
    }
    
    public function live_classes_all(){  //new api for live class (+)

        $this->is_valid_request(['GET']);
        $userdata =$this->users_model->get(['id' => $this->user_id])->getRow();


        $cohort = $this->cohort_students_model->get_join([
                                                            ['cohorts','cohorts.id = cohort_students.cohort_id'],
                                                        ],
                                                        ['user_id' => $this->user_id],
                                                        [   'cohort_students.cohort_id as cohort_id',
                                                            'cohorts.title as cohort_title',
                                                            'cohorts.cohort_id as cohort_code',
                                                            'cohorts.start_date as cohort_start_date',
                                                            'cohorts.end_date as cohort_end_date',
                                                        ])->getRowArray();

            // $live_classes = $this->live_class_model->get(   
            //                                                 ['cohort_id' => $cohort['cohort_id']],
            //                                                 ['id','session_id','title','date','fromTime','toTime']
            //                                             )->getResultArray();

            $live_classes = $this->live_class_model->get_live_classes($this->user_id,null,null,$cohort['cohort_id']);
            log_message('error', $cohort['cohort_id']);
            
            
            $live_now = [];
            $upcoming = [];
            $expired = [];
            
            
            foreach ($live_classes as $live_class) {
                if (strpos($live_class['status'], 'Live Now') !== false) {
                    $live_now[] = $live_class;
                }
                else if (strpos($live_class['status'], 'Next Live') !== false) {
                    $upcoming[] = $live_class;
                }
                else {
                    $expired[] = $live_class;
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
    
    
     public function all_live_class()
    {
        $this->is_valid_request(['GET']);
        $userdata =$this->users_model->get(['id' => $this->user_id])->getRow();
        $liveclass = $this->live_class_model->get_live_classes($this->user_id,$userdata->course_id);

        
        $this->response_data = ['status' => 1,'message' => 'succesfully' , 'data' => $liveclass];
        return $this->set_response();
    }
    
    
    public function generate_jwt_token(){
            $this->is_valid_request(['GET']);
            $key = (string) get_settings('zoom_api_key');
            $secret = (string) get_settings('zoom_secret_key');
            
            
            // print_r($secret); exit();
            $meetingNumber = preg_replace('/\D+/', '', (string) $this->request->getGet('meeting_number'));
            $role = (int) ($this->request->getGet('role') ?? 0);
            $role = $role === 1 ? 1 : 0;

            if ($meetingNumber === '' || $key === '' || $secret === '') {
                $this->response_data = ['status' => 0,'message' => 'Invalid meeting configuration' , 'data' => []];
                return $this->set_response();
            }
    
            $iat = time() - 30;
            $exp = $iat + 60 * 60 * 2;
    
            $tokenData = [
                'sdkKey' => $key,
                'appKey' => $key,
                'mn' => $meetingNumber,
                'role' => $role,
                'iat' => $iat,
                'exp' => $exp,
                'tokenExp' => $exp
            ];
    
            $jwt = JWT::encode($tokenData, $secret, 'HS256');
            $this->response_data = ['status' => 1,'message' => 'succesfully' , 'data' => ['jwt_token' => $jwt]];
            return $this->set_response();
    }

    public function get_liveclass(){
        $this->is_valid_request(['GET']);
        $subject_id = $this->request->getGet('subject_id');
        $userdata =$this->users_model->get(['id' => $this->user_id])->getRow();

        $cohort = $this->cohort_students_model->get_join([
                                                        ['cohorts','cohorts.id = cohort_students.cohort_id'],
                                                    ],
                                                    ['user_id' => $this->user_id],
                                                    [   'cohort_students.cohort_id as cohort_id',
                                                        'cohorts.title as cohort_title',
                                                        'cohorts.cohort_id as cohort_code',
                                                        'cohorts.start_date as cohort_start_date',
                                                        'cohorts.end_date as cohort_end_date',
                                                    ])->getRowArray();

        // $live_classes = $this->live_class_model->get(   
        //                                                 ['cohort_id' => $cohort['cohort_id']],
        //                                                 ['id','session_id','title','date','fromTime','toTime']
        //                                             )->getResultArray();

        $live_classes = $this->live_class_model->get_live_classes($this->user_id,null,null,$cohort['cohort_id']);
        
        
        $live_now = [];
        $upcoming = [];
        $expired = [];
        
        
        foreach ($live_classes as $live_class) {
            if (strpos($live_class['status'], 'Live Now') !== false) {
                $live_now[] = $live_class;
            }
            else if (strpos($live_class['status'], 'Next Live') !== false) {
                $upcoming[] = $live_class;
            }
            else {
                $expired[] = $live_class;
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
    
    


}
