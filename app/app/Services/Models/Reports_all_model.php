<?php namespace App\Models;

use CodeIgniter\Model;
use App\Models\Apps_model;
use App\Models\App_productivity_model;
use App\Models\Team_members_model;
use App\Models\User_app_usage_model;
use App\Models\Users_model;

class Reports_all_model extends Base_model
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
    
    public function getAvg_total_desktime($team_ids=null,$user_ids=null,$from_date,$to_date,$search_by=null,$search_key=null)
    {
        $query = $this->db->table('user_app_usage')
            ->select('COUNT(DISTINCT user_id) as user_count, SUM(duration) as total_duration')
            ->join('users', 'users.id = user_app_usage.user_id')
            ->where('usage_date>=', $from_date)
            ->where('usage_date<=', $to_date)
                        ->limit('100');

            
        if (!empty($team_ids)) {
            $query->whereIn('users.team_id', $team_ids);
        }
        if (!empty($user_ids)) {
            $query->whereIn('users.id', $user_ids);
        }
        
        if($search_by == 'query')
            { 
                $query->where(function($query) use ($search_key) {
                    $query->where('user_app_usage.app_name', 'LIKE', '%' . $search_key . '%')
                          ->orWhere('user_app_usage.app_description', 'LIKE', '%' . $search_key . '%');
                        //   ->orWhere('user_app_usage.yet_another_column', 'LIKE', '%' . $search_key . '%');
                });
            }
            elseif($search_by == 'app')
            { 
                $query->where("user_app_usage.app_name LIKE '%$search_key%'");
            }
            else
            {
                
            }
        
        $result = $query->groupBy('users.id')->get()->getRowArray();
        
        
        if(!empty($result))
        {
             $userCount = $result['user_count'];
            $totalDuration = $result['total_duration'];
            $averageTotalDuration = $userCount > 0 ? $totalDuration / $userCount : 0;
        }
        else
        {
            $averageTotalDuration = 0;
        }
        
       
        
        return $averageTotalDuration;
    }

    public function getAvg_total_idletime($team_ids=null,$user_ids=null,$from_date,$to_date,$search_by=null,$search_key=null)
    {
        $query = $this->db->table('idle_time')
            ->select('COUNT(DISTINCT user_id) as user_count, SUM(duration) as total_duration')
            ->join('users', 'users.id = idle_time.user_id')
            ->where('DATE(idle_time.created_at)>=', $from_date)
            ->where('DATE(idle_time.created_at)<=', $to_date);
            
        if (!empty($team_ids)) {
            $query->whereIn('users.team_id', $team_ids);
        }
        if (!empty($user_ids)) {
            $query->whereIn('idle_time.user_id', $user_ids);
        }
        
        $result = $query->groupBy('users.id')->get()->getRowArray();
        
        if(!empty($result))
        {
             $userCount = $result['user_count'];
            $totalDuration = $result['total_duration'];
            $averageTotalDuration = $userCount > 0 ? $totalDuration / $userCount : 0;
            
        }
        else
        {
            $averageTotalDuration = 0;
        }
        
       
        
        return $averageTotalDuration;
    }

    public function getAvg_total_time_at_work($team_ids,$user_ids,$from_date,$to_date,$search_by=null,$search_key=null)
    {
  
        $query = $this->db->table('user_app_usage')
            ->select('MIN(start_time) as first_start_time, MAX(end_time) as last_end_time, TIMEDIFF(MAX(end_time), MIN(start_time)) as difference,user_id')
            ->join('users', 'users.id = user_app_usage.user_id')
            ->where('usage_date>=', $from_date)
            ->where('usage_date<=', $to_date)
            ->limit('100');

            
        if (!empty($team_ids)) {
            $query->whereIn('users.team_id', $team_ids);
        }
        if (!empty($user_ids)) {
            $query->whereIn('users.id', $user_ids);
        }
        
        
        if($search_by == 'query')
            { 
                $query->where(function($query) use ($search_key) {
                    $query->where('user_app_usage.app_name', 'LIKE', '%' . $search_key . '%')
                          ->orWhere('user_app_usage.app_description', 'LIKE', '%' . $search_key . '%');
                        //   ->orWhere('user_app_usage.yet_another_column', 'LIKE', '%' . $search_key . '%');
                });
            }
            elseif($search_by == 'app')
            { 
                $query->where("user_app_usage.app_name LIKE '%$search_key%'");
            }
            else
            {
                
            }
        
        $result = $query->groupBy('users.id')->get()->getResultArray();
            
        $totalSeconds = 0;
        $userCount = count($result);
        
        foreach ($result as $row) {
            $duration = $row['difference'];
            list($hours, $minutes, $seconds) = explode(':',$duration);
            $totalSeconds += $hours * 3600 + $minutes * 60 + $seconds;
        }
        
        $averageDifference = $userCount > 0 ? $totalSeconds / $userCount : 0;
        
        return $averageDifference;
    
    }
    
    public function getAvg_productive_time($team_ids,$user_ids,$from_date,$to_date,$search_by=null,$search_key=null)
    {
        $logger = service('logger');
        $user_apps = $this->get_user_app_productivity();
        $app_ids = [];
        foreach ($user_apps as $app) {
            if ($app['productivity_level'] == 2) {
                $app_ids[] = $app['id'];
            }
        }
        
    
        
        $query = $this->db->table('user_app_usage')
            // ->select('MIN(start_time) as first_start_time, MAX(end_time) as last_end_time, TIMEDIFF(MAX(end_time), MIN(start_time)) as difference,user_id')
            
            ->select('SUM(duration) as duration') 
            ->join('users', 'users.id = user_app_usage.user_id')
            ->where('usage_date>=', $from_date)
            ->where('usage_date<=', $to_date)
                        ->limit('100');

            
        if (!empty($team_ids)) {
            $query->whereIn('users.team_id', $team_ids);
        }
        if (!empty($user_ids)) {
            $query->whereIn('users.id', $user_ids);
        }
        
        if($search_by == 'query')
            { 
                $query->where(function($query) use ($search_key) {
                    $query->where('user_app_usage.app_name', 'LIKE', '%' . $search_key . '%')
                          ->orWhere('user_app_usage.app_description', 'LIKE', '%' . $search_key . '%');
                        //   ->orWhere('user_app_usage.yet_another_column', 'LIKE', '%' . $search_key . '%');
                });
            }
            elseif($search_by == 'app')
            { 
                $query->where("user_app_usage.app_name LIKE '%$search_key%'");
            }
            else
            {
                
            }
        
        $result = $query->groupBy('users.id')->get()->getResultArray();
            
        $totalSeconds = 0;
        $userCount = count($result);
        
        foreach ($result as $row) {
            
            $totalSeconds += $row['duration'];
            // $duration = $row['difference'];
            // list($hours, $minutes, $seconds) = explode(':',$duration);
            // $totalSeconds += $hours * 3600 + $minutes * 60 + $seconds;
        }
        
        $averageDifference = $userCount > 0 ? $totalSeconds / $userCount : 0;
        return $averageDifference;
    }
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    public function get_absent_list($team_id=null,$date) 
    {
        $this->users_model = new Users_model();
        $absent = [];
        if(!empty($team_id))
        {
            $all = $this->users_model->get(['team_id' => $team_id,'role_id !=' => '1'])->getResultArray();
            
            $working = $this->db->table('users')
                ->select('*')
                ->join('user_app_usage', 'user_app_usage.user_id = users.id')
                ->where('users.team_id',$team_id)
                ->where('usage_date', $date)
                ->groupBy('user_app_usage.user_id')
                ->orderBy('users.name', 'asc')
                ->get()
                ->getResultArray();
        }
        else
        {
            $all = $this->users_model->get(['role_id !=' => '1'])->getResultArray();
            
             $working = $this->db->table('users')
                ->select('users.*')
                ->join('user_app_usage', 'user_app_usage.user_id = users.id')
                ->where('usage_date', $date)
                ->groupBy('user_app_usage.user_id')
                ->orderBy('users.name', 'asc')
                ->get()
                ->getResultArray();
        }

       
        
    
            
        $absent = array_filter($all, function($user) use ($working) {
            // Check if the user ID is not present in the $working array
            return !in_array($user['id'], array_column($working, 'id'));
        });
        
        // If you want the absent users to be indexed by user ID, you can reindex the array
        $absent = array_values($absent);
        
        // echo "<pre>";
        // print_r($absent); exit();
     
        return $absent;
    }
    
    
    
    public function get_earlyleft_list($team_id = null, $from_date, $to_date) 
    {
        $query = $this->db->table('users')
            ->select('users.*, MIN(user_app_usage.start_time) as first_start_time, MAX(user_app_usage.end_time) as last_end_time')
            ->join('user_app_usage', 'user_app_usage.user_id = users.id')
            ->where('usage_date>=', $from_date)
            ->where('usage_date<=', $to_date);
    
        if (!empty($team_id)) {
            $query->where('users.team_id', $team_id);
        }
    
        $result = $query->groupBy('users.id')->get()->getResultArray();
        
      
        $earlyResult = [];

    
        foreach ($result as $k => $row) {
            $userId = $row['id'];
            $teamId = $row['team_id'];
            $workfrom = $row['working_from'];
         
            $schedule = $this->getWorkSchedule($userId, $teamId,$from_date,$to_date,$workfrom);
            
            $checktime = date('H:i:s',strtotime($row['last_end_time']));

            if ($schedule &&  $checktime < $schedule['end_time']) 
            {
                $diff = $this->time_difference($schedule['end_time'], $checktime);
                $result[$k]['difference'] =$diff;
                $earlyResult[] = $result[$k];
            }
            
            
        }
        return $earlyResult;
    }
    
    
    public function get_late_list($team_id = null, $from_date, $to_date) 
    {
        $query = $this->db->table('users')
            ->select('users.*, MIN(user_app_usage.start_time) as first_start_time, MAX(user_app_usage.end_time) as last_end_time')
            ->join('user_app_usage', 'user_app_usage.user_id = users.id')
            ->where('usage_date>=', $from_date)
            ->where('usage_date<=', $to_date);
    
        if (!empty($team_id)) {
            $query->where('users.team_id', $team_id);
        }
    
        $result = $query->groupBy('users.id')->get()->getResultArray();
        
        $lateResult = [];

    
        foreach ($result as $k => $row) {
            $userId = $row['id'];
            $teamId = $row['team_id'];
            $workfrom = $row['working_from'];
         
            $schedule = $this->getWorkSchedule($userId, $teamId,$from_date,$to_date,$workfrom);
            
            $checktime = date('H:i:s',strtotime($row['first_start_time']));

            if ($schedule &&  $checktime > $schedule['start_time']) 
            {
                 $diff = $this->time_difference($schedule['start_time'], $checktime);
                $result[$k]['difference'] =$diff;
                $lateResult[] = $result[$k];
            }
            
            
        }
        
        return $lateResult;
    }
    
    
     public function get_idle_list($team_id = null, $from_date, $to_date) 
    {
        $query = $this->db->table('users')
            ->select('users.*,SUM(duration) as idle_time')
            ->join('idle_time', 'idle_time.user_id = users.id')
            ->where('DATE(idle_time.created_at)>=', $from_date)
            ->where('DATE(idle_time.created_at)<=', $to_date);
    
        if (!empty($team_id)) {
            $query->where('users.team_id', $team_id);
        }
    
        $result = $query->groupBy('users.id')->get()->getResultArray();
        
       
        
        return $result;
    }
    
    
    public function get_desktime_data($team_ids = null,$user_ids = null, $from_date, $to_date,$search_by = NULL, $search_key = NULL) 
    {
        $query = $this->db->table('users')
            ->select('users.*, SUM(duration) as total_desktime')
            ->join('user_app_usage', 'user_app_usage.user_id = users.id')
            ->where('usage_date>=', $from_date)
            ->where('usage_date<=', $to_date);
    
        if (!empty($team_ids)) {
            $query->where('users.team_id', $team_ids);
        }
        if (!empty($user_ids)) {
            $query->where('users.id', $user_ids);
        }
    
        $result = $query->groupBy('users.id')->get()->getResultArray();
        
        if(!empty($result))
        {
            usort($result, function ($a, $b) {
                return $b['total_desktime'] - $a['total_desktime'];
            });
        }
        
        return $result;
    }
    
    public function get_productive_data($team_ids = null,$user_ids = null, $from_date, $to_date,$search_by = NULL, $search_key = NULL) 
    {
        $user_apps = $this->get_user_app_productivity();
        $app_ids = [];
        foreach ($user_apps as $app) {
            if ($app['productivity_level'] == 2) {
                $app_ids[] = $app['id'];
            }
        }
        
        $query = $this->db->table('users')
            ->select('users.*, SUM(duration) as total_work, SUM(CASE WHEN app_id IN (' . implode(',', $app_ids) . ') THEN duration ELSE 0 END) AS total_duration')
            ->join('user_app_usage', 'user_app_usage.user_id = users.id')
            ->where('usage_date >=', $from_date)
            ->where('usage_date <=', $to_date);
            
        if (!empty($team_ids)) {
            $query->where('users.team_id', $team_ids);
        }
        if (!empty($user_ids)) {
            $query->where('user_app_usage.user_id', $user_ids);
        }
    
        $result = $query->groupBy('user_app_usage.user_id')->get()->getResultArray();
        
        
        if(!empty($result))
        {
            foreach($result as $key => $val)
            {
                if($val['total_work'] != 0)
                {
                    $percentage = ($val['total_duration'] / $val['total_work']) * 100;
                    $result[$key]['pr_percentage'] = round($percentage);
                }
                else
                {
                    $result[$key]['pr_percentage'] = 0;
                }
                
                
            }
            
            // Custom sort function
            usort($result, function ($a, $b) {
                return $b['pr_percentage'] - $a['pr_percentage'];
            });
        }
        
        
        
      
        return $result;
    }



     public function get_unproductive_data($team_ids = null,$user_ids = null, $from_date, $to_date,$search_by = NULL, $search_key = NULL) 
    {
        $user_apps = $this->get_user_app_productivity();
        $app_ids = [];
        foreach ($user_apps as $app) {
            if ($app['productivity_level'] == 0) {
                $app_ids[] = $app['id'];
            }
        }
        
        $query = $this->db->table('users')
            ->select('users.*, SUM(duration) as total_work, SUM(CASE WHEN app_id IN (' . implode(',', $app_ids) . ') THEN duration ELSE 0 END) AS total_duration')
            ->join('user_app_usage', 'user_app_usage.user_id = users.id')
            ->where('usage_date >=', $from_date)
            ->where('usage_date <=', $to_date);
            
        if (!empty($team_ids)) {
            $query->where('users.team_id', $team_ids);
        }
        if (!empty($user_ids)) {
            $query->where('users.id', $user_ids);
        }
    
    
        $result = $query->groupBy('users.id')->get()->getResultArray();
        
        
        if(!empty($result))
        {
            foreach($result as $key => $val)
            {
                $percentage = ($val['total_duration'] / $val['total_work']) * 100;
                
                $result[$key]['pr_percentage'] = round($percentage);
            }
            
            // Custom sort function
            usort($result, function ($a, $b) {
                return $b['pr_percentage'] - $a['pr_percentage'];
            });
        }
        
        
        
      
        return $result;
    }
    
    public function get_effective_data($team_ids = null,$user_ids = null, $from_date, $to_date,$search_by = NULL, $search_key = NULL) 
    {
        $user_apps = $this->get_user_app_productivity();
        $app_ids = [];
        foreach ($user_apps as $app) {
            if ($app['productivity_level'] == 2) {
                $app_ids[] = $app['id'];
            }
        }
        
        $query = $this->db->table('users')
            ->select('users.*, SUM(duration) as total_work, SUM(CASE WHEN app_id IN (' . implode(',', $app_ids) . ') THEN duration ELSE 0 END) AS total_duration,users.team_id')
            ->join('user_app_usage', 'user_app_usage.user_id = users.id')
            ->where('usage_date>=', $from_date)
            ->where('usage_date<=', $to_date);
            // ->whereIn('app_id', $app_ids);
    
        if (!empty($team_ids)) {
            $query->where('users.team_id', $team_ids);
        }
        if (!empty($user_ids)) {
            $query->where('users.id', $user_ids);
        }
    
        $result = $query->groupBy('users.id')->get()->getResultArray();
        
    
        if(!empty($result))
        {
             foreach ($result as $k => $row) 
             {
                $userId = $row['id'];
                $teamId = $row['team_id'];
                $workfrom = $row['working_from'];
             
                $schedule = $this->getWorkSchedule($userId, $teamId,$from_date,$to_date,$workfrom);
                
                if(!empty($schedule))
                {
                    $min_hr = $schedule['min_hours'];
                    $min_seconds = $min_hr*3600;
                    
                    $effect = intval($row['total_duration']/$min_seconds*100);
                    $result[$k]['effectiveness'] = $effect;
                }
                else
                {
                    $result[$k]['effectiveness'] = 0;
                }
                
                
             }
             
              usort($result, function ($a, $b) {
                    return $b['effectiveness'] - $a['effectiveness'];
                });
        }
        
        return $result;
    }
    
    public function get_late_or_early_data($team_ids = null,$user_ids = null, $from_date, $to_date) 
    {
        $query = $this->db->table('users')
            ->select('users.*, MIN(user_app_usage.start_time) as first_start_time,MAX(user_app_usage.end_time) as last_end_time, users.team_id,user_app_usage.created_at')
            ->join('user_app_usage', 'user_app_usage.user_id = users.id')
            ->where('usage_date>=', $from_date)
            ->where('usage_date<=', $to_date);
        
        if (!empty($team_ids)) 
        {
            $query->where('users.team_id', $team_ids);
        }
        if (!empty($user_ids)) {
            $query->where('users.id', $user_ids);
        }
    
        $newResult = $query->groupBy('users.id')->get()->getResultArray();
        
        // echo "<pre>";
        // print_r($newResult);
        //  exit();
        

        $lateResult = [];
        $earlyResult = [];
    
        
        foreach ($newResult as $k => $row) {
            $userId = $row['id'];
            $teamId = $row['team_id'];
            $workfrom = $row['working_from'];
             
            $schedule = $this->getWorkSchedule($userId, $teamId,$from_date,$to_date,$workfrom);
        
            $checktimeearly = date('H:i:s',strtotime($row['last_end_time']));

            if ($schedule &&  $checktimeearly < $schedule['end_time']) 
            {
                $diff = $this->time_difference($schedule['end_time'], $checktimeearly);
                $newResult[$k]['difference'] =$diff;
                $earlyResult[] = $newResult[$k];
            }
            
            $checktime = date('H:i:s',strtotime($row['first_start_time']));
            
            if ($schedule &&  $checktime > $schedule['start_time']) 
            {
                $diff = $this->time_difference($schedule['start_time'], $checktime);
                $newResult[$k]['difference'] =$diff;
                $lateResult[] = $newResult[$k];
            }
        }
        
        $result = [ 
            'working' => $newResult,
            'late' => $lateResult,
            'early' => $earlyResult,
            
        ];
        
        
        return $result;
       
       
    }
    
    
    public function get_absent_data($team_id = null, $from_date, $to_date) 
    {
        $this->users_model = new Users_model();
         $absent = [];
        if(!empty($team_id))
        {
            $all = $this->users_model->get(['team_id' => $team_id,'role_id !=' => '1'])->getResultArray();

            
            $working = $this->db->table('users')
                ->select('users.*')
                ->join('user_app_usage', 'user_app_usage.user_id = users.id')
                ->where('users.team_id',$team_id)
                ->where('usage_date>=', $from_date)
                ->where('usage_date<=', $to_date)
                ->where('role_id !=', 1)
                ->groupBy('user_app_usage.user_id')
                ->orderBy('users.name', 'asc')
                ->get()
                ->getResultArray();
        }
        else
        {
             $all = $this->users_model->get(['role_id !=' => '1'])->getResultArray();
            
             $working = $this->db->table('users')
                ->select('users.*')
                ->join('user_app_usage', 'user_app_usage.user_id = users.id') 
                ->where('usage_date >=', $from_date)
                ->where('usage_date <=', $to_date)
                ->where('role_id !=', 1)
                ->groupBy('user_app_usage.user_id')
                ->orderBy('users.name', 'asc')
                ->get()
                ->getResultArray();
        }

       
        
    
            
        $absent = array_filter($all, function($user) use ($working) {
            // Check if the user ID is not present in the $working array
            return !in_array($user['id'], array_column($working, 'id'));
        });
        
        // If you want the absent users to be indexed by user ID, you can reindex the array
        $absent = array_values($absent);
        
        // echo "<pre>";
        // print_r($absent); exit();
     
        return $absent;
       
       
    }
    
    
    public function get_idle_data($team_ids = null,$user_ids = null, $from_date, $to_date)  
    {

        $query = $this->db->table('users')
            ->select('users.*,SUM(duration) as idle_time')
            ->join('idle_time', 'idle_time.user_id = users.id')
            ->where('DATE(idle_time.created_at)>=', $from_date)
            ->where('DATE(idle_time.created_at)<=', $to_date)
            ->where('role_id !=', 1)
            ->groupBy('idle_time.user_id')
            ->orderBy('users.name', 'asc');
            
       
        if (!empty($team_ids)) 
        {
            $query->where('users.team_id', $team_ids);
        }
        if (!empty($user_ids)) {
            $query->where('users.id', $user_ids);
        }
    
        $result = $query->groupBy('users.id')->get()->getResultArray();
        return $result;
    }
    
    
    public function last10_productive_users()  
    {
        $from_date = date('Y-m-d H:i:s', strtotime('-10 minutes'));
        
        $user_apps = $this->get_user_app_productivity();
        $app_ids = [];
        foreach ($user_apps as $app) {
            if ($app['productivity_level'] == 2) {
                $app_ids[] = $app['id'];
            }
        }
        
         $query = $this->db->table('user_app_usage')
        ->select('COUNT(DISTINCT user_app_usage.user_id) as user_count')
        ->join('users', 'users.id = user_app_usage.user_id')
        ->whereIn('app_id', $app_ids)
        ->where('user_app_usage.created_at >=', $from_date)
        ->get()
        ->getRowArray();
    
        // Return the count of users
        return $query['user_count'];

    }
    
     public function last10_unproductive_users()  
    {
        $from_date = date('Y-m-d H:i:s', strtotime('-10 minutes'));
        
        $user_apps = $this->get_user_app_productivity();
        $app_ids = [];
        foreach ($user_apps as $app) {
            if ($app['productivity_level'] == 0) {
                $app_ids[] = $app['id'];
            }
        }
        
         $query = $this->db->table('user_app_usage')
        ->select('COUNT(DISTINCT user_app_usage.user_id) as user_count')
        ->join('users', 'users.id = user_app_usage.user_id')
        ->whereIn('app_id', $app_ids)
        ->where('user_app_usage.created_at >=', $from_date)
        ->get()
        ->getRowArray();
    
        // Return the count of users
        return $query['user_count'];

    }
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    public function get_app_productivity($from_date, $to_date,$productivity) 
    {
        $where = [   'user_app_usage.created_at >=' => $from_date.' '.'00:00:00',
                        'user_app_usage.created_at <=' => $to_date.' '.'23:59:59',
                        'apps.productivity_level' =>$productivity
                        
                        ];
            
        
        
        return $this->get_join(
            [
                [ 
                    'apps', 'apps.id = user_app_usage.app_id'
                ]
            ], $where, 
            ['user_app_usage.app_id','SUM(user_app_usage.duration) as total_duration','apps.title'], 
            ['total_duration' => 'desc'], 5, 'app_id'
        )->getResultArray();
    
        
        
        
    }
    
    
    
    
    
    
    
    
    
    
    


    public function getWorkSchedule($userId, $teamId,$from_date,$to_date,$workfrom)
    {
        $logger = service('logger');
        $userSpecificQuery = $this->db->table('work_schedule')
            ->where('user_id', $userId)
            ->where('working_from', $workfrom)
            ->where('(start_date IS NULL OR start_date <= '."'".$from_date."'".')')
            ->where('(end_date IS NULL OR end_date >= '."'".$to_date."'".')')
            ->get()
            ->getRowArray();
            
      
        if (empty($userSpecificQuery)) {
            $teamSpecificQuery = $this->db->table('work_schedule')
                ->where('team_id', $teamId)
                ->where('working_from', $workfrom)
                ->where('(start_date IS NULL OR start_date <= '."'".$from_date."'".')')
                ->where('(end_date IS NULL OR end_date >= '."'".$to_date."'".')')
                ->where('type', 'team')
                ->get()
                ->getRowArray();
                 $logger->error('schedule: ' . db_connect()->getLastQuery());
                
    
    
            if (empty($teamSpecificQuery)) {
                $globalQuery = $this->db->table('work_schedule')
                    // ->where('user_id', 0)
                    // ->where('team_id', 0)
                    ->where('(start_date IS NULL OR start_date <= '."'".$from_date."'".')')
                    ->where('(end_date IS NULL OR end_date >= '."'".$to_date."'".')')
                    ->where('type', 'global')
                    ->get()
                    ->getRowArray();
                    
                  
    
                return empty($globalQuery) ? null : $globalQuery;
            } else {
                return $teamSpecificQuery;
            }
        } else {
            return $userSpecificQuery;
        }
    }
    
    function time_difference($time1, $time2) {
        // Convert times to seconds
        $seconds1 = strtotime($time1);
        $seconds2 = strtotime($time2);
    
        // Calculate the difference in seconds
        $difference = abs($seconds2 - $seconds1);
    
        // Convert difference to hours, minutes, and seconds
        $hours = floor($difference / 3600);
        $difference %= 3600;
        $minutes = floor($difference / 60);
        $seconds = $difference % 60;
    
        // Return the difference
        return sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds);
    }
    
        public function get_user_app_productivity($user_id=0){
        $this->users_model = new Users_model();
        $this->team_members_model = new Team_members_model();
        $this->apps_model = new Apps_model();
        $this->app_productivity_model= new App_productivity_model();
        

        if($user_id>0){
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
        } else{
            $users = $this->users_model->get(['role_id' => 2])->getResultArray();
            $user_ids = array_column($users,'id');
            $teams = $this->users_model->get(['id' => $user_ids])->getResultArray();
            $team_ids = array_column($teams,'team_id');
            $apps = $this->apps_model->get(NULL, ['id', 'title', 'productivity_level'])->getResultArray();
            foreach($apps as $key=> $app){
                $app_id = $app['id'];
                if(!empty($team_ids)){
                    $team_productivity_exist = $this->app_productivity_model->get(['app_id' => $app_id, 'team_id' => $team_ids, 'type' => 'team'])->getRowArray();

                    if(!empty($team_productivity_exist)){
                        $app_productivity_type = $team_productivity_exist['productivity_level'];
                    }else{
                        $global_productivity_exist = $this->app_productivity_model->get(['team_id' => 0, 'type' => 'global', 'app_id' => $app_id])->getRowArray();
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
        }
        return $apps;
    }



    


}