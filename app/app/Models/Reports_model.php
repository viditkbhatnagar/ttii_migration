<?php namespace App\Models;

use CodeIgniter\Model;
use App\Models\Apps_model;
use App\Models\App_productivity_model;
use App\Models\Team_members_model;
use App\Models\User_app_usage_model;
use App\Models\Users_model;

class Reports_model extends Base_model
{
    protected $table         = 'user_app_usage';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\User_app_usage';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['user_id','app_id','user_client_agent_id','start_time','end_time','duration','is_active','created_by','updated_by','created_at','updated_at'];  // Fields that can be manipulated
    

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',

    ];
    
    protected $validationMessages = [
        'title' => [
            'required' => 'Teams Title is Required!'
        ]
    ];
    
        
    public function timeToMinutes($time)
    {
        sscanf($time, "%dh %dm", $hours, $minutes);
        return $hours * 60 + $minutes;
    }
    
    
    
    public function get_report_datas($start_date = null, $end_date = null, $user_ids = [])
    {
        
        if($start_date == $end_date)
        {
           // Adjust end date to include the whole day
            $end_date = date('Y-m-d', strtotime($end_date . ' + 1 day'));
        }
      
        
        $query1 = $this->db->table('user_app_usage')
            ->select('SUM(duration) as total_duration')
            ->whereIn('user_id', $user_ids)
            ->where("created_at >= '$start_date' AND created_at < '$end_date'")
            ->get()
            ->getRowArray();
            
        if(!empty($query1))
        {
            $desk_time = $query1['total_duration'];
            $seconds = $desk_time;
            $hours = floor($seconds / 3600);
            $minutes = floor(($seconds % 3600) / 60);
            
            $totdesk_time = $hours.'h '.$minutes.'m';
        }
        else
        {
            $totdesk_time = '0h 0m';
        }
        
        
        $query2 = $this->db->table('user_app_usage')
            ->select('MIN(start_time) as first_start_time, MAX(end_time) as last_end_time, TIMEDIFF(MAX(end_time), MIN(start_time)) as difference')
            ->whereIn('user_id', $user_ids)
            ->where("created_at >= '$start_date' AND created_at < '$end_date'")
            ->get()
            ->getRowArray();
            
        if(!empty($query2))
        {
            $time_at_work = $query2['difference'];
            list($hours, $minutes, $seconds) = explode(':', $time_at_work);
            $tottime_at_work = $hours.'h '.$minutes.'m';
            
            $time_at_works = ($hours * 3600) + ($minutes * 60) + $seconds;
            
        }
        else
        {
            $time_at_works =0;
            $tottime_at_work = '0h 0m';
        }
        
        // Calculate the difference in minutes
        $minutes1 = $this->timeToMinutes($tottime_at_work);
        $minutes2 = $this->timeToMinutes($totdesk_time);
        $differenceInMinutes = $minutes1 - $minutes2;
        
        // Convert the difference back to hours and minutes
        $hours = floor($differenceInMinutes / 60);
        $minutes = $differenceInMinutes % 60;
        
        $totdiff = $hours.'h '.$minutes.'m';
        
        $productive = $this->get_user_productivity($start_date,$end_date,$user_ids);
        
        if($time_at_works != 0)
        {
            $productivity_percent = intval($productive/$time_at_works*100);
        }
        else
        {
            $productivity_percent = 0;
        }
        
        $effective = $this->get_user_effectivity($start_date,$end_date,$user_ids);
        
        // if($time_at_works != 0)
        // {
        //     $productivity_percent = intval($productive/$time_at_works*100);
        // }
        // else
        // {
        //     $productivity_percent = 0;
        // }
        
    
        
        $productivity = [
            'desk_time' => $totdesk_time,
            'time_at_work' => $tottime_at_work,
            'offline_time' => $totdiff,
            'productivity' => $productivity_percent,
            'effectiveness' => '2h 17m',
            'employees' => $this->get_employees_data($start_date, $end_date, $user_ids),
            'apps' => $this->get_apps_data($start_date, $end_date, $user_ids),
        ];
        
        
        echo "<pre>";
        print_r(json_encode($productivity)); exit();
        
       

        
        $data = [
            'data_primary' => $data_primary,
            'data_secondary' => [],
        ];
        
    }
    
    public function get_user_productivity($start_date = null, $end_date = null, $user_ids = [])
    {
        $users = $this->db->table('users')
            ->select('users.*')
            ->whereIn('users.id', $user_ids)
            ->get()
            ->getResultArray();
            
            
        $tot_productive = 0;

        if(!empty($users))
        {
            foreach($users as $key => $val)
            {
                $totproductive= $this->get_employees_productive_all($start_date, $end_date,$val['id']);
                $tot_productive +=$totproductive;
            }
        }
        else
        {
            $tot_productive = $this->get_employees_productive_all($start_date, $end_date);
        }
        return $tot_productive;
    }
    
    
    public function get_user_effectivity($start_date = null, $end_date = null, $user_ids = [])
    {
                $logger = service('logger');

        $users = $this->db->table('users')
            ->select('users.*')
            ->whereIn('users.id', $user_ids)
            ->get()
            ->getResultArray();


        if(!empty($users))
        {
            foreach($users as $key => $val)
            {
                $schedule = $this->db->table('work_schedule')
                    ->select('SUM(min_hours) as total_hours')
                    ->where('user_id', $val['id'])
                    ->where('start_date <=', $start_date)
                    ->orWhere('end_date >=', $end_date)
                    ->orderBy('start_date', 'ASC')
                    ->get()
                    ->getRowArray();
                    
                if(empty($schedule))
                {
                    if($val['team_id'] != 0)
                    {
                        $schedule = $this->db->table('work_schedule')
                        ->select('SUM(min_hours) as total_hours')
                        ->where('team_id', $val['team_id'])
                        ->where('start_date <=', $start_date)
                        ->Where('end_date >=', $end_date)
                        ->orderBy('start_date', 'ASC')
                        ->get()
                        ->getRowArray();
                    }
                    else
                    {
                        $schedule = $this->db->table('work_schedule')
                        ->select('SUM(min_hours) as total_hours')
                        ->where('type', 'global')
                        ->where('start_date <=', $start_date)
                        ->Where('end_date >=', $end_date)
                        ->orderBy('start_date', 'ASC')
                        ->get()
                        ->getRowArray();
                    }
                }
                    
                    // $logger->error('Database Error: ' . db_connect()->getLastQuery());
                    
                // echo "<pre>";
                // print_r($schedule);
                // exit();
        
            }
            
            $tot_productive = "";
        }
        else
        {
            $tot_productive = $this->get_employees_effectivity($start_date, $end_date);
        }
        return $tot_productive;
    }
    
    
    public function get_employees_productive_all($start_date = null, $end_date = null,$user_id = null) 
    {
        $this->users_model = new Users_model();
        // $team = $this->db->table('team_members')
        //     ->select('team_id')
        //     ->where('member_id', $user_id)
        //     ->get()
        //     ->getRowArray();
        
        $team = $this->users_model->get(['team_id'],['id' => $user_id])->getRowArray();
            
        if(!empty($team))
        {
            $productivityLevels = $this->get_app_productivity($team['team_id']);
        }
        else
        {
            $productivityLevels = $this->get_app_productivity(0);
        }
        
        if(!empty($user_id))
        {
            $userAppUsage = $this->db->table('user_app_usage')
                ->select('*') 
                ->where('user_id', $user_id)
                ->where("created_at >= '$start_date' AND created_at <= '$end_date'")
                ->orderBy('user_app_usage.id', 'DESC') 
                ->groupBy('user_app_usage.id')
                ->get()
                ->getResultArray();
        }
        else
        {
            $userAppUsage = $this->db->table('user_app_usage')
                ->select('*') 
                ->where("created_at >= '$start_date' AND created_at <= '$end_date'")
                ->orderBy('user_app_usage.id', 'DESC') 
                ->groupBy('user_app_usage.id')
                ->get()
                ->getResultArray();
        }
                
        // echo "<pre>";
        // print_r($userAppUsage); exit();
                
                    //   $logger->error('Database Error: ' . db_connect()->getLastQuery());
                    
        $totalDurations = [
                'productive' => 0,
                'unproductive' => 0,
                'neutral' => 0,
                'total'=>0
            ];
            
        if(!empty($userAppUsage))  
        {
            // Iterate through user app usage data
            foreach ($userAppUsage as $appUsage) {
                $appId = $appUsage['app_id'];
                
                // Find the productivity level for the current app
                $productivityLevel = '';
                foreach ($productivityLevels as $level) {
                    if ($level['app_id'] == $appId) {
                        $productivityLevel = $level['productivity_type'];
                        break;
                    }
                }
                // Add the duration to the corresponding productivity level
                $totalDurations[$productivityLevel] += $appUsage['duration'];
                $totalDurations['total']  += $appUsage['duration'];
                
                
               
            }
        }   
            
        return $totalDurations['productive'];
    }
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    public function get_employees_data($start_date = null, $end_date = null, $user_ids = [])
    {
        if(!empty($user_ids))
        {
        
            $users = $this->db->table('users')
            ->select('users.*')
            ->whereIn('users.id', $user_ids)
            ->get()
            ->getResultArray();
        }
        else
        {
            $users = $this->db->table('users')
            ->select('users.*')
            ->get()
            ->getResultArray();
        }
            
        $employees =array();    
        $productive_emp = array();            
            
       
        if(!empty($users))
        {
            foreach($users as $key => $val)
            {
                $productive = $this->get_employees_productivity($start_date, $end_date,$val['id']);
                
                if($productive['total'] != 0)
                {
                
                    $employees['productive'][] = array(
                                
                                'user_id' =>$val['id'],
                                'profile_image' =>$val['profile_picture'],
                                'employee_name' =>$val['name'],
                                'productive_time' => $productive['productive'],
                                'total_time' => $productive['total'],
                                'percentage' => intval($productive['productive']/$productive['total']*100)
                        
                        );
                        
                    $employees['unproductive'][] = array(
                                
                                'user_id' =>$val['id'],
                                'profile_image' =>$val['profile_picture'],
                                'employee_name' =>$val['name'],
                                'unproductive_time' => $productive['unproductive'],
                                'total_time' => $productive['total'],
                                'percentage' => intval($productive['unproductive']/$productive['total']*100)
                        
                        );
                }
                else
                {
                    $employees['productive'][] = array(
                                
                                'user_id' =>$val['id'],
                                'profile_image' =>$val['profile_picture'],
                                'employee_name' =>$val['name'],
                                'productive_time' => 0,
                                'total_time' => 0,
                                'percentage' => 0
                        
                        );
                        
                    $employees['unproductive'][] = array(
                                
                                'user_id' =>$val['id'],
                                'profile_image' =>$val['profile_picture'],
                                'employee_name' =>$val['name'],
                                'unproductive_time' => 0,
                                'total_time' => 0,
                                'percentage' => 0
                        
                        );
                }
                
                $effective = $this->get_employees_productivity($start_date, $end_date,$val['id']);
                
                $desk_time = $this->get_employees_desk_time($start_date, $end_date,$val['id']);
                
                $employees['desk_time'][] = array(
                                
                                'user_id' =>$val['id'],
                                'profile_image' =>$val['profile_picture'],
                                'employee_name' =>$val['name'],
                                'desk_time' => $desk_time,
                             
                        
                        );
                
                
            }
        }
        
        
        
        
        
        
        
        
    
    
        // $employees = [
        //     'productive' => $productive,
        //     'unproductive' => $unproductive,
        //     'effective' => $this->get_employees_effective($start_date, $end_date),
        //     'desk_time' => $this->get_employees_desk_time($start_date, $end_date),
        //     'late' => $this->get_employees_late($start_date, $end_date),
        //     'absence' => $this->get_employees_absence($start_date, $end_date),
        //     'offline_time' => $this->get_employees_offline_time($start_date, $end_date),
        // ];
        return $employees;
    }
    
    public function get_employees_productivity($start_date = null, $end_date = null,$user_id = null) 
    {

        // $team = $this->db->table('team_members')
        //     ->select('team_id')
        //     ->where('member_id', $user_id)
        //     ->get()
        //     ->getRowArray();
        
        $this->users_model = new Users_model();
        $team = $this->users_model->get(['team_id'],['id' => $user_id])->getRowArray();
            
        if(!empty($team))
        {
            $productivityLevels = $this->get_app_productivity($team['team_id']);
        }
        else
        {
            $productivityLevels = $this->get_app_productivity(0);
        }

            
            $userAppUsage = $this->db->table('user_app_usage')
                ->select('*') 
                ->where('user_id', $user_id)
                ->where("created_at >= '$start_date' AND created_at <= '$end_date'")
                ->orderBy('user_app_usage.id', 'DESC') 
                ->groupBy('user_app_usage.id')
                ->get()
                ->getResultArray();
                
                
            $totalDurations = [
                'productive' => 0,
                'unproductive' => 0,
                'neutral' => 0,
                'total'=>0
            ];
            
            
            // Iterate through user app usage data
            foreach ($userAppUsage as $appUsage) {
                $appId = $appUsage['app_id'];
                
                // Find the productivity level for the current app
                $productivityLevel = '';
                foreach ($productivityLevels as $level) {
                    if ($level['app_id'] == $appId) {
                        $productivityLevel = $level['productivity_type'];
                        break;
                    }
                }
                // Add the duration to the corresponding productivity level
                $totalDurations[$productivityLevel] += $appUsage['duration'];
                $totalDurations['total']  += $appUsage['duration'];
            }
            
            
        return $totalDurations;
    }
    
    public function get_employees_desk_time($start_date = null, $end_date = null,$user_id = null) 
    {
        $query = $this->db->table('user_app_usage')
            ->select('SUM(duration) as total_desktime') // Alias for the SUM
            ->where('user_id', $user_id)
            ->where("created_at >= '$start_date' AND created_at <= '$end_date'")
            ->orderBy('user_app_usage.id', 'DESC') 
            ->get()
            ->getRowArray();
            
        // print_r($query); exit();
            
        if(!empty($query['total_desktime'])) 
        {
            return $query['total_desktime'];
        }
        else 
        {
            return "0";
        }
    }

   
    public function get_app_productivity($team_id=0){
        
        $this->apps_model = new Apps_model();
        $this->app_productivity_model = new App_productivity_model();
        
        $apps = $this->apps_model->get(NULL, ['id', 'title', 'productivity_level'])->getResultArray();
      
       
        $team_id = $team_id>0 ? $team_id : 0;
        foreach($apps as $key=> $app){
            $apps[$key]['app_name'] = $app['title'];
            $apps[$key]['app_id'] = $app['id'];
            $app_id = $app['id'];
            $productivity_exist = $this->app_productivity_model->get(['app_id' => $app_id,'team_id' => $team_id])->getNumRows();
            if($productivity_exist>0){
                $app_productivity = $this->app_productivity_model->get(['team_id' => $team_id, 'app_id' => $app_id], ['productivity_level'])->getRowArray();

                $app_productivity_type = $app_productivity['productivity_level'];
            }else{
                $app_productivity_type = $app['productivity_level'];
            }
            
            if($app_productivity_type == 0) {
                $productivity_type = "unproductive";
            } else if ($app_productivity_type == 1) {
                $productivity_type = "neutral";
            } else if ($app_productivity_type == 2) {
                $productivity_type = "productive";
            }
            $apps[$key]['productivity_type'] = $productivity_type;
        }
        
        
        return $apps;
        

    }


    public function get_employees_effective($start_date = null, $end_date = null,$user_ids = null) {
        $employees = [
            [
                'user_id' => 1,
                'profile_image' => 'assets/app/images/users/avatar-1.jpg',
                'employee_name' => 'John Doe',
                'effective_time' => 28800,
                'total_time' => 38800,
                'percentage' => intval(28800/38800*100)
            ],[
                'user_id' => 1,
                'profile_image' => 'assets/app/images/users/avatar-1.jpg',
                'employee_name' => 'John Doe',
                'effective_time' => 28800,
                'total_time' => 38800,
                'percentage' => intval(28800/38800*100)
            ],[
                'user_id' => 1,
                'profile_image' => 'assets/app/images/users/avatar-1.jpg',
                'employee_name' => 'John Doe',
                'effective_time' => 28800,
                'total_time' => 38800,
                'percentage' => intval(28800/38800*100)
            ],[
                'user_id' => 1,
                'profile_image' => 'assets/app/images/users/avatar-1.jpg',
                'employee_name' => 'John Doe',
                'effective_time' => 28800,
                'total_time' => 38800,
                'percentage' => intval(28800/38800*100)
            ],[
                'user_id' => 1,
                'profile_image' => 'assets/app/images/users/avatar-1.jpg',
                'employee_name' => 'John Doe',
                'effective_time' => 28800,
                'total_time' => 38800,
                'percentage' => intval(28800/38800*100)
            ]
        ];
        return $employees;
    }


    public function get_employees_late($start_date = null, $end_date = null) {
        $employees = [
            [
                'user_id' => 1,
                'profile_image' => 'assets/app/images/users/avatar-1.jpg',
                'employee_name' => 'John Doe',
                'late_hours' => '',
                'late_days' => '',
            ],[
                'user_id' => 1,
                'profile_image' => 'assets/app/images/users/avatar-1.jpg',
                'employee_name' => 'John Doe',
                'late_hours' => '',
                'late_days' => '',
            ],[
                'user_id' => 1,
                'profile_image' => 'assets/app/images/users/avatar-1.jpg',
                'employee_name' => 'John Doe',
                'late_hours' => '',
                'late_days' => '',
            ],[
                'user_id' => 1,
                'profile_image' => 'assets/app/images/users/avatar-1.jpg',
                'employee_name' => 'John Doe',
                'late_hours' => '',
                'late_days' => '',
            ],[
                'user_id' => 1,
                'profile_image' => 'assets/app/images/users/avatar-1.jpg',
                'employee_name' => 'John Doe',
                'late_hours' => '',
                'late_days' => '',
            ]
        ];
        return $employees;
    }

    public function get_employees_absence($start_date = null, $end_date = null) {
        $employees = [
            [
                'user_id' => 1,
                'profile_image' => 'assets/app/images/users/avatar-1.jpg',
                'employee_name' => 'John Doe',
                'absence_days' => '',
            ],[
                'user_id' => 1,
                'profile_image' => 'assets/app/images/users/avatar-1.jpg',
                'employee_name' => 'John Doe',
                'absence_days' => '',
            ],[
                'user_id' => 1,
                'profile_image' => 'assets/app/images/users/avatar-1.jpg',
                'employee_name' => 'John Doe',
                'absence_days' => '',
            ],[
                'user_id' => 1,
                'profile_image' => 'assets/app/images/users/avatar-1.jpg',
                'employee_name' => 'John Doe',
                'absence_days' => '',
            ],[
                'user_id' => 1,
                'profile_image' => 'assets/app/images/users/avatar-1.jpg',
                'employee_name' => 'John Doe',
                'absence_days' => '',
            ]
        ];
        return $employees;
    }

    public function get_employees_offline_time($start_date = null, $end_date = null) {
        $employees = [
            [
                'user_id' => 1,
                'profile_image' => 'assets/app/images/users/avatar-1.jpg',
                'employee_name' => 'John Doe',
                'offline_time' => '',
            ],[
                'user_id' => 1,
                'profile_image' => 'assets/app/images/users/avatar-1.jpg',
                'employee_name' => 'John Doe',
                'offline_time' => '',
            ],[
                'user_id' => 1,
                'profile_image' => 'assets/app/images/users/avatar-1.jpg',
                'employee_name' => 'John Doe',
                'offline_time' => '',
            ],[
                'user_id' => 1,
                'profile_image' => 'assets/app/images/users/avatar-1.jpg',
                'employee_name' => 'John Doe',
                'offline_time' => '',
            ],[
                'user_id' => 1,
                'profile_image' => 'assets/app/images/users/avatar-1.jpg',
                'employee_name' => 'John Doe',
                'offline_time' => '',
            ]
        ];
        return $employees;
    }

    public function get_apps_data($start_date = null, $end_date = null,$user_ids = null){
        $apps = [
            'productive' => $this->get_apps_productive($start_date, $end_date),
            'unproductive' => $this->get_apps_unproductive($start_date, $end_date),
            'neutral' => $this->get_apps_neutral($start_date, $end_date),
        ];
        return $apps;
    }
    
    
    public function get_apps_productive($start_date = null, $end_date = null) {
        $apps = [
            [
                'app_id' => 1,
                'app_title' => 'docs.google.com',
                'app_icon' => 'assets/app/images/icons/application.png',
                'total_duration' => 109090,
            ],[
                'app_id' => 1,
                'app_title' => 'Slack',
                'app_icon' => 'assets/app/images/icons/application.png',
                'total_duration' => 109090,
            ],[
                'app_id' => 1,
                'app_title' => 'Google Chrome',
                'app_icon' => 'assets/app/images/icons/application.png',
                'total_duration' => 109090,
            ],[
                'app_id' => 1,
                'app_title' => 'google.com',
                'app_icon' => 'assets/app/images/icons/application.png',
                'total_duration' => 109090,
            ],[
                'app_id' => 1,
                'app_title' => 'Adobe Premiere Pro',
                'app_icon' => 'assets/app/images/icons/application.png',
                'total_duration' => 109090,
            ],
        ];
        return $apps;
    }

    public function get_apps_unproductive($start_date = null, $end_date = null) {
        $apps = [
            [
                'app_id' => 1,
                'app_title' => 'instagram.com',
                'app_icon' => 'assets/app/images/icons/application.png',
                'total_duration' => 109090,
            ],[
                'app_id' => 1,
                'app_title' => 'chat.openai.com',
                'app_icon' => 'assets/app/images/icons/application.png',
                'total_duration' => 109090,
            ],[
                'app_id' => 1,
                'app_title' => 'web.whatsapp.com',
                'app_icon' => 'assets/app/images/icons/application.png',
                'total_duration' => 109090,
            ],[
                'app_id' => 1,
                'app_title' => 'Windows Explorer',
                'app_icon' => 'assets/app/images/icons/application.png',
                'total_duration' => 109090,
            ],[
                'app_id' => 1,
                'app_title' => 'quillbot.com',
                'app_icon' => 'assets/app/images/icons/application.png',
                'total_duration' => 109090,
            ],
        ];
        return $apps;
    }

    public function get_apps_neutral($start_date = null, $end_date = null) {
        $apps = [
            [
                'app_id' => 1,
                'app_title' => 'spts.org',
                'app_icon' => 'assets/app/images/icons/application.png',
                'total_duration' => 109090,
            ],[
                'app_id' => 1,
                'app_title' => 'thecropsite.com',
                'app_icon' => 'assets/app/images/icons/application.png',
                'total_duration' => 109090,
            ],[
                'app_id' => 1,
                'app_title' => 'sci-tech-today.com',
                'app_icon' => 'assets/app/images/icons/application.png',
                'total_duration' => 109090,
            ],[
                'app_id' => 1,
                'app_title' => 'Resolve',
                'app_icon' => 'assets/app/images/icons/application.png',
                'total_duration' => 109090,
            ],[
                'app_id' => 1,
                'app_title' => 'Brave',
                'app_icon' => 'assets/app/images/icons/application.png',
                'total_duration' => 109090,
            ],
        ];
        return $apps;
    }
    
    
    
    
    
    
    public function get_monthly_attendance_report($month_year, $team_id=""){
        $this->team_members_model = new Team_members_model();
        $this->user_app_usage_model = new User_app_usage_model();
        $this->users_model = new Users_model();

      
      
        $logger = service('logger');
        
        $month = date('m',strtotime($month_year));
        $year = date('Y',strtotime($month_year));
        $first_date = date('Y-m-01',strtotime($month_year)); 
        $last_date  = date('Y-m-t',strtotime($month_year));
        $datesArray = $this->getDatesArray($year, $month);
        
        $where =[];
        if($team_id!="") 
        {
            $where['users.team_id'] = $team_id;
        }
        
        $members = $this->users_model->get(
            $where, null, ['users.name' => 'asc']
        )->getResultArray();

        $member_ids = array_column($members,'id');  
        $total_productive_time = $this->get_total_productive_time_by_month(3,$first_date,$last_date);
        foreach($members as $key=> $member){
            $members[$key]['total_desktime'] = $this->get_total_desktime_by_month($member['id'],$first_date,$last_date);
            $members[$key]['total_time_at_work'] = $this->get_total_time_at_work_by_month($member['id'],$first_date,$last_date);
            // $members[$key]['total_productive_time'] = $this->get_total_productive_time_by_month($member['id'],$first_date,$last_date);
        }

        // get attendance for all members
        $where2['date(start_time) >='] =$first_date;
        $where2['date(start_time) <='] =$last_date;
        $where2['user_id'] = $member_ids;
        $group_by = ['user_id', 'date(start_time)'];
        $attendances = $this->user_app_usage_model->get($where2, NULL, NULL, NULL, $group_by)->getResultArray();
        
        $attendance_array = [];
        foreach($attendances as $attendance){
            $attendance_array[$attendance['user_id']][date('Y-m-d', strtotime($attendance['start_time']))]['attendance'] = date('Y-m-d', strtotime($attendance['start_time']));
        }
        $logger->error('Database Error: ' . print_r($attendance_array,true));
        
        return ['members' => $members, 'total_productivity' => $total_productive_time, 'date_array' => $datesArray, 'attendance_array' => $attendance_array];
    }
    
    
    function getDatesArray($year, $month) {
        $numDays = date("t", strtotime("$year-$month-01")); // Get number of days in the month
        $datesArray = array();
        for ($i = 1; $i <= $numDays; $i++) {
            $date = date("Y-m-d", strtotime("$year-$month-$i"));
            array_push($datesArray, $date);
        }
        return $datesArray;
    }
    
    public function get_total_desktime_by_month($user_id,$from_date, $to_date){

        $query = $this->db->table('user_app_usage')
            ->select('SUM(duration) as total_desktime') // Alias for the SUM
            ->where('user_id', $user_id)
            ->where('DATE(created_at) >=', $from_date) 
            ->where('DATE(created_at) <=', $to_date) 
            ->orderBy('user_app_usage.id', 'DESC') 
            ->get()
            ->getRowArray();
            
        if(!empty($query)) 
        {
            
            return get_duration_by_seconds($query['total_desktime']);
        }
        else 
        {
            return "00:00:00";
        }
    }

    public function get_total_time_at_work_by_month($user_id,$from_date, $to_date){
        $query = $this->db->table('user_app_usage')
            ->select('MIN(start_time) as first_start_time, MAX(end_time) as last_end_time, TIMEDIFF(MAX(end_time), MIN(start_time)) as difference')
            ->where('user_id', $user_id)
            ->where('DATE(created_at) >=', $from_date) 
            ->where('DATE(created_at) <=', $to_date) 
            ->get()
            ->getRowArray();
            
        // print_r($query); exit();
            
        if(!empty($query['difference'])) 
        {
            return $query['difference'];
        }
        else
        {
            $query['difference'] ="00:00:00";
            return $query['difference'];
        }
    }
    
    public function get_total_productive_time_by_month($user_id,$from_date, $to_date){
        $user_apps = $this->get_app_productivity_by_user($user_id);
        $app_ids = [];
        foreach($user_apps as $app) {
            if ($app['productivity_level'] == 2) {
                $app_ids[] = $app['id'];
            }
        }
        
        $query = $this->db->table('user_app_usage')
            ->select('SUM(duration) as duration') 
            ->where('user_id', $user_id)
            ->whereIn('app_id', $app_ids)
            ->where('DATE(created_at) >=', $from_date) 
            ->where('DATE(created_at) <=', $to_date) 
            ->get()
            ->getRowArray();
            
        if(!empty($query['duration'])) 
        {
            return $query['duration'];
        }
        else
        {
            $query['duration'] ="0";
            return $query['duration'];
        }
    }
    
    
    public function get_app_productivity_by_user($user_id){
        $this->users_model = new Users_model();
        $this->team_members_model = new Team_members_model();
        $this->apps_model = new Apps_model();
        $this->app_productivity_model= new App_productivity_model();
        

        $team = $this->users_model->get(['id' => $user_id])->getRow()->team_id;
        
        
        $apps = $this->apps_model->get(NULL, ['id', 'title', 'productivity_level'])->getResultArray();
        $team_id = $team>0 ? $team : 0;
        foreach($apps as $key=> $app){
            $app_id = $app['id'];
            if($team_id>0){
                $team_productivity_exist = $this->app_productivity_model->get(['team_id' => $team_id, 'type' => 'team', 'app_id' => $app_id])->getRowArray();

                if(!empty($team_productivity_exist)){
                    $app_productivity_type = $team_productivity_exist['productivity_level'];
                }else{
                    $global_productivity_exist = $this->app_productivity_model->get(['app_id' => $app_id, 'team_id' => 0, 'type' => 'global'])->getRowArray();
                    if(!empty($global_productivity_exist)){
                        $app_productivity_type = $global_productivity_exist['productivity_level'];
                    }else{
                        $app_productivity_type = $app['productivity_level'];
                    }
                }
            }else{
                $app_productivity_type = $app['productivity_level'];
            }
            
            $apps[$key]['productivity_level'] = $app_productivity_type;
        }

        return $apps;
    }
    
    
    
    

}