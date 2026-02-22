<?php
namespace App\Controllers\App;
use App\Models\Reports_model;
use App\Models\Reports_all_model;
use App\Models\Teams_model;
use App\Models\Users_model;
use App\Models\User_app_usage_model;
use App\Models\Team_members_model;
use App\Models\Exports_types_model;
use App\Models\Export_history_model;



class Reports extends AppBaseController
{
    private $reports_model;
    private $reports_all_model;
    private $teams_model;
    private $users_model;
    private $user_app_usage_model;
    private $team_members_model;
     private $exports_types_model;
    private $export_history_model;


    
    public function __construct()
    {
        parent::__construct();
        $this->reports_model = new Reports_model();
        $this->reports_all_model = new Reports_all_model();
        $this->teams_model = new Teams_model();
        $this->users_model = new Users_model();
        $this->reports_model = new Reports_model();
        $this->user_app_usage_model = new User_app_usage_model();
        $this->team_members_model = new Team_members_model();
         $this->exports_types_model = new Exports_types_model();
        $this->export_history_model = new Export_history_model();


    }
    
      public function all(){
        // $this->data['list_items'] = $this->team_report_model->get()->getResultArray();
         $this->data['export_history'] = $this->export_history_model->get()->getResultArray();
        $this->data['export_types'] = $this->exports_types_model->get()->getResultArray();
        $this->data['page_title'] = 'Reports';
        $this->data['page_name'] = 'Reports/all';
        return view('App/index', $this->data);
    }

    public function index_old(){
        // $this->data['list_items'] = $this->team_report_model->get()->getResultArray();
        $this->data['page_title'] = 'Team Report';
        $this->data['page_name'] = 'Reports/index';
        return view('App/index', $this->data);
    }


    // ABID
    public function index($name_key){
        
        if($name_key == 'employee')
        {
            redirect()->to(base_url('app/reports/compare_by_employee'));
        }
        
        // echo "<pre>";
        // print_r($_GET); 

        $page_names = [
            'overview' => 'overview_section',
            // 'employee' => 'compare_by_employee_section',
            'date' => 'compare_by_date_section',
            'hour' => 'extra_hours_section'
            ];
            
            
        
         if(!empty($this->request->getPost('export_period')))
        {
            $export_period = isset($_POST['export_period']) ? $_POST['export_period'] : array();
        }
        else
        {
            $export_period = '';

        }

        
        if (!empty($this->request->getPost('from_date')) && !empty($this->request->getPost('to_date')))
            {
                $from_date = $this->request->getPost('from_date');
                $to_date = $this->request->getPost('to_date');
                
            }
            else
            {
                $from_date =date('Y-m-d',strtotime("-1 days"));
                $to_date=date('Y-m-d',strtotime("-1 days"));
                
            }
            
            
            
        if(!empty($this->request->getPost('team_id')))
        {
            $team_ids = isset($_POST['team_id']) ? $_POST['team_id'] : array();
        }
        else
        {
            $team_ids = [];

        }
        
        if(!empty($this->request->getPost('employee_id[]')))
        {
            $user_ids = $this->request->getPost('employee_id[]');
        }
        else
        {
            $user_ids = [];
        }
        
        
         $this->data['export_period'] = $export_period;
        $this->data['from_date'] = $from_date;
        $this->data['to_date'] = $to_date;
        $this->data['team_ids'] = $team_ids;
        $this->data['user_ids'] = $user_ids;
        
  
        
        // $data_report = $this->reports_model->get_employees_data($from_date, $to_date, $user_ids);
        
        
        $this->data['total_desktime'] = $this->reports_all_model->getAvg_total_desktime($team_ids,$user_ids,$from_date,$to_date);
        $this->data['total_idletime'] = $this->reports_all_model->getAvg_total_idletime($team_ids,$user_ids,$from_date,$to_date);
        $this->data['total_time_at_work'] = $this->reports_all_model->getAvg_total_time_at_work($team_ids,$user_ids,$from_date,$to_date);
        $this->data['total_productive_time'] = $this->reports_all_model->getAvg_productive_time($team_ids,$user_ids,$from_date,$to_date);

        
    
            
        $this->data['most_productive'] = $this->reports_all_model->get_productive_data($team_ids,$user_ids,$from_date,$to_date);
        $this->data['most_unproductive'] = $this->reports_all_model->get_unproductive_data($team_ids,$user_ids,$from_date,$to_date);
        $this->data['most_effective'] = $this->reports_all_model->get_effective_data($team_ids,$user_ids,$from_date,$to_date);
        $this->data['desktime_data'] = $this->reports_all_model->get_desktime_data($team_ids,$user_ids,$from_date,$to_date);
        
        $this->data['productive_apps'] =  $this->reports_all_model->get_app_productivity($from_date,$to_date,2);
        $this->data['nuetral_apps'] =  $this->reports_all_model->get_app_productivity($from_date,$to_date,1);
        $this->data['unproductive_apps'] =  $this->reports_all_model->get_app_productivity($from_date,$to_date,0);
        
        
        
        $late_or_early = $this->reports_all_model->get_late_or_early_data($team_ids,$user_ids,$from_date,$to_date);
        $absent = $this->reports_all_model->get_absent_data($team_ids,$from_date,$to_date);
        $idle = $this->reports_all_model->get_idle_data($team_ids,$user_ids,$from_date,$to_date);
        
        $this->data['top_datas'] = [
                                    'late' => $late_or_early['late'],
                                    'early_leaving' => $late_or_early['early'],
                                    'absent' => $absent,
                                    'idle' =>$idle
        
                                    ];
    
         
        
        // $this->data['productive_apps'] = [];
        // $this->data['nuetral_apps'] = [];
        // $this->data['unproductive_apps'] = [];

        // $this->data['most_productive'] =[];
        // $this->data['most_unproductive'] =[];
        // $this->data['most_effective'] = [];
        // $this->data['desktime_data'] = [];
      
      
        
        $this->data['teams'] = $this->teams_model->get([],['id','title'])->getResultArray();
        $this->data['employees'] = $this->users_model->get(['role_id' => 2],['id','name'])->getResultArray();
               


        
        //   echo "<pre>";
        // print_r($this->data['teams']); exit();
        
        $this->data['page_title'] = 'Report';
        $this->data['page_name'] = 'Reports/'.$page_names[$name_key];
        return view('App/index', $this->data);
    }
    
    
    
    
    
    public function employee()
    {
        
         $from_date = (!empty($this->request->getPost('from_date'))) ? $this->request->getPost('from_date') : date('Y-m-d', strtotime("-1 days"));
        $to_date = (!empty($this->request->getPost('to_date'))) ? $this->request->getPost('to_date') : date('Y-m-d', strtotime("-1 days"));
        
        $primary_team_ids = (!empty($this->request->getPost('primary_team_id[]'))) ? $this->request->getPost('primary_team_id[]') : [];
        $primary_user_ids = (!empty($this->request->getPost('primary_employee_id[]'))) ? $this->request->getPost('primary_employee_id[]') : [];
        
        $secondary_team_ids = (!empty($this->request->getPost('secondary_team_id[]'))) ? $this->request->getPost('secondary_team_id[]') : [];
        $secondary_user_ids = (!empty($this->request->getPost('secondary_employee_id[]'))) ? $this->request->getPost('secondary_employee_id[]') : [];
        
        
        $this->data['pteam_ids'] = $primary_team_ids;
        $this->data['puser_ids'] = $primary_user_ids;
        
        $this->data['steam_ids'] = $secondary_team_ids;
        $this->data['suser_ids'] = $secondary_user_ids;
        
        
        
        
        
        
     
        $this->data['total_desktime_1'] = $this->reports_all_model->getAvg_total_desktime($primary_team_ids, $primary_user_ids, $from_date, $to_date);
        $this->data['total_idletime_1'] = $this->reports_all_model->getAvg_total_idletime($primary_team_ids, $primary_user_ids, $from_date, $to_date);
        $this->data['total_time_at_work_1'] = $this->reports_all_model->getAvg_total_time_at_work($primary_team_ids, $primary_user_ids, $from_date, $to_date);
        $this->data['total_productive_time_1'] = $this->reports_all_model->getAvg_productive_time($primary_team_ids, $primary_user_ids, $from_date, $to_date);
        
        $this->data['total_desktime_2'] = $this->reports_all_model->getAvg_total_desktime($secondary_team_ids, $secondary_user_ids, $from_date, $to_date);
        $this->data['total_idletime_2'] = $this->reports_all_model->getAvg_total_idletime($secondary_team_ids, $secondary_user_ids, $from_date, $to_date);
        $this->data['total_time_at_work_2'] = $this->reports_all_model->getAvg_total_time_at_work($secondary_team_ids, $secondary_user_ids, $from_date, $to_date);
        $this->data['total_productive_time_2'] = $this->reports_all_model->getAvg_productive_time($secondary_team_ids, $secondary_user_ids, $from_date, $to_date);
        
    
        
        $this->data['most_productive_1'] = $this->reports_all_model->get_productive_data($primary_team_ids, $primary_user_ids, $from_date, $to_date);
        $this->data['most_unproductive_1'] = $this->reports_all_model->get_unproductive_data($primary_team_ids, $primary_user_ids, $from_date, $to_date);
        $this->data['most_effective_1'] = $this->reports_all_model->get_effective_data($primary_team_ids, $primary_user_ids, $from_date, $to_date);
        $this->data['desktime_data_1'] = $this->reports_all_model->get_desktime_data($primary_team_ids, $primary_user_ids, $from_date, $to_date);
        
        $this->data['productive_apps_1'] = $this->reports_all_model->get_app_productivity($from_date, $to_date, 2);
        $this->data['nuetral_apps_1'] = $this->reports_all_model->get_app_productivity($from_date, $to_date, 1);
        $this->data['unproductive_apps_1'] = $this->reports_all_model->get_app_productivity($from_date, $to_date, 0);
        
        $this->data['most_productive_2'] = $this->reports_all_model->get_productive_data($secondary_team_ids, $secondary_user_ids, $from_date, $to_date);
        $this->data['most_unproductive_2'] = $this->reports_all_model->get_unproductive_data($secondary_team_ids, $secondary_user_ids, $from_date, $to_date);
        $this->data['most_effective_2'] = $this->reports_all_model->get_effective_data($secondary_team_ids, $secondary_user_ids, $from_date, $to_date);
        $this->data['desktime_data_2'] = $this->reports_all_model->get_desktime_data($secondary_team_ids, $secondary_user_ids, $from_date, $to_date);
        
        $this->data['productive_apps_2'] = $this->reports_all_model->get_app_productivity($from_date, $to_date, 2);
        $this->data['nuetral_apps_2'] = $this->reports_all_model->get_app_productivity($from_date, $to_date, 1);
        $this->data['unproductive_apps_2'] = $this->reports_all_model->get_app_productivity($from_date, $to_date, 0);

        
        $team_ids = [];
        $user_ids = [];
        
        $late_or_early = $this->reports_all_model->get_late_or_early_data($team_ids,$user_ids,$from_date,$to_date);
        $absent = $this->reports_all_model->get_absent_data($team_ids,$from_date,$to_date);
        $idle = $this->reports_all_model->get_idle_data($team_ids,$user_ids,$from_date,$to_date);
        
        $this->data['top_datas'] = [
                                    'late' => $late_or_early['late'],
                                    'early_leaving' => $late_or_early['early'],
                                    'absent' => $absent,
                                    'idle' =>$idle
        
                                    ];
    
        
        $this->data['most_unproductive'] = $this->reports_all_model->get_unproductive_data($team_ids,$user_ids,$from_date,$to_date);
        $this->data['most_effective'] = $this->reports_all_model->get_effective_data($team_ids,$user_ids,$from_date,$to_date);
        $this->data['desktime_data'] = $this->reports_all_model->get_desktime_data($team_ids,$user_ids,$from_date,$to_date);
        
        
        
        // $this->data['productive_apps'] = [];
        // $this->data['nuetral_apps'] = [];
        // $this->data['unproductive_apps'] = [];

        // $this->data['most_productive'] =[];
        // $this->data['most_unproductive'] =[];
        // $this->data['most_effective'] = [];
        // $this->data['desktime_data'] = [];
      
      
        
        $this->data['teams'] = $this->teams_model->get([],['id','title'])->getResultArray();
        $this->data['employees'] = $this->users_model->get(['role_id' => 2],['id','name'])->getResultArray();
               


        
        //   echo "<pre>";
        // print_r($this->data['teams']); exit();
        
        $this->data['page_title'] = 'Report';
        $this->data['page_name'] = 'Reports/compare_by_employee_section';
        return view('App/index', $this->data);
    }

    
    
    //AMEER
    public function productive_report($team_id = null){
        $logger = service('logger');
        
        if (!empty($this->request->getGet('from_date')) && !empty($this->request->getGet('to_date')))
            {
                $from_date = $this->request->getGet('from_date');
                $to_date = $this->request->getGet('to_date');
                
            }
            else
            {
                $from_date =date('Y-m-d');
                $to_date=date('Y-m-d');
                
            }
            
            $this->data['from_date'] = $from_date;
            $this->data['to_date'] = $to_date;
            
            
        $this->data['teams_list'] = $this->teams_model->get_team_with_member_count();
        // $this->data['total_members'] = $this->team_members_model->get()->getNumRows();
        $this->data['total_members'] = $this->users_model->get(['role_id !=' => 1])->getNumRows();

        
        $this->data['teams'] = array_column($this->data['teams_list'], 'title', 'id');
        $this->data['team_members'] = $this->users_model->get_array_column([], 'id', 'team_id');
                
                
        $this->data['productive_data'] = $this->reports_all_model->get_productive_data($team_id,null,$from_date,$to_date);

        
        $this->data['team_id'] = $team_id;
        $this->data['page_title'] = 'Productive Report';
        $this->data['page_name'] = 'Reports/productive_report';
        return view('App/index', $this->data);
    }
    
    public function un_productive_report($team_id = null){
        $logger = service('logger');
        
         
        if (!empty($this->request->getGet('from_date')) && !empty($this->request->getGet('to_date')))
            {
                $from_date = $this->request->getGet('from_date');
                $to_date = $this->request->getGet('to_date');
                
            }
            else
            {
                $from_date =date('Y-m-d');
                $to_date=date('Y-m-d');
                
            }
            
            $this->data['from_date'] = $from_date;
            $this->data['to_date'] = $to_date;
            
            
        $this->data['teams_list'] = $this->teams_model->get_team_with_member_count();
        $this->data['total_members'] = $this->users_model->get(['role_id !=' => 1])->getNumRows();

        $this->data['teams'] = array_column($this->data['teams_list'], 'title', 'id');
        $this->data['team_members'] = $this->users_model->get_array_column([], 'id', 'team_id');
        
        $this->data['unproductive_data'] = $this->reports_all_model->get_unproductive_data($team_id,null,$from_date,$to_date);

        
        $this->data['team_id'] = $team_id;
        $this->data['page_title'] = 'Un Productive Report';
        $this->data['page_name'] = 'Reports/un_productive_report';
        return view('App/index', $this->data);
    }
    
    public function effective_report($team_id = null){
        $logger = service('logger');
        
        if (!empty($this->request->getGet('from_date')) && !empty($this->request->getGet('to_date')))
            {
                $from_date = $this->request->getGet('from_date');
                $to_date = $this->request->getGet('from_date');
                
            }
            else
            {
                $from_date =date('Y-m-d');
                $to_date=date('Y-m-d');
                
            }
            
            $this->data['from_date'] = $from_date;
            $this->data['to_date'] = $to_date;
            
        $this->data['teams_list'] = $this->teams_model->get_team_with_member_count();
        $this->data['total_members'] = $this->users_model->get(['role_id !=' => 1])->getNumRows();
        $this->data['teams'] = array_column($this->data['teams_list'], 'title', 'id');
        $this->data['team_members'] = $this->users_model->get_array_column([], 'id', 'team_id');
        
        $this->data['effective_data'] = $this->reports_all_model->get_effective_data($team_id,null,$from_date,$to_date);
      
        $productive_data = $this->reports_all_model->get_productive_data($team_id,null,$from_date,$to_date);
        
        if(!empty($productive_data))
        {
            $min_hr = 7;
            $min_seconds = $min_hr * 3600;
            foreach($productive_data as $key => $val)
            {
                $effect = intval($val['total_duration']/$min_seconds*100);
                $productive_data[$key]['effectiveness'] = $effect;
            }
        }

        $this->data['effective_data'] = $productive_data;
        $this->data['team_id'] = $team_id;
        $this->data['page_title'] = 'Effective Report';
        $this->data['page_name'] = 'Reports/effective_report';
        return view('App/index', $this->data);
    }
    
    public function desk_time_report($team_id = null){
        $logger = service('logger');
          
            
        if (!empty($this->request->getGet('from_date')) && !empty($this->request->getGet('to_date')))
            {
                $from_date = $this->request->getGet('from_date');
                $to_date = $this->request->getGet('to_date');
                
            }
            else
            {
                $from_date =date('Y-m-d');
                $to_date=date('Y-m-d');
                
            }
            
            $this->data['from_date'] = $from_date;
            $this->data['to_date'] = $to_date;
        
        
        $this->data['teams_list'] = $this->teams_model->get_team_with_member_count();
        $this->data['total_members'] = $this->users_model->get(['role_id !=' => 1])->getNumRows();
        $this->data['teams'] = array_column($this->data['teams_list'], 'title', 'id');
        $this->data['team_members'] = $this->users_model->get_array_column([], 'id', 'team_id');
        
        $this->data['desktime_data'] = $this->reports_all_model->get_desktime_data($team_id,null,$from_date,$to_date);

        
        $this->data['team_id'] = $team_id;
        $this->data['page_title'] = 'Desk Time Report';
        $this->data['page_name'] = 'Reports/desk_time_report';
        return view('App/index', $this->data);
    }
    
    public function late_report($team_id = null){
        $logger = service('logger');
        
          
        if (!empty($this->request->getGet('from_date')) && !empty($this->request->getGet('to_date')))
            {
                $from_date = $this->request->getGet('from_date');
                $to_date = $this->request->getGet('to_date');
                
            }
            else
            {
                $from_date =date('Y-m-d');
                $to_date=date('Y-m-d');
                
            }
            
            $this->data['from_date'] = $from_date;
            $this->data['to_date'] = $to_date;
            
        $this->data['teams_list'] = $this->teams_model->get_team_with_member_count();
        $this->data['total_members'] = $this->users_model->get(['role_id !=' => 1])->getNumRows();
        $this->data['teams'] = array_column($this->data['teams_list'], 'title', 'id');
        $this->data['team_members'] = $this->users_model->get_array_column([], 'id', 'team_id');
        
        $this->data['late_data'] = $this->reports_all_model->get_late_list($team_id,$from_date,$to_date);
        
        $this->data['team_id'] = $team_id;
        $this->data['page_title'] = 'Late Report';
        $this->data['page_name'] = 'Reports/late_report';
        return view('App/index', $this->data);
    }
    
    public function early_report($team_id = null){
        $logger = service('logger');
        
         
           
        if (!empty($this->request->getGet('from_date')) && !empty($this->request->getGet('to_date')))
            {
                $from_date = $this->request->getGet('from_date');
                $to_date = $this->request->getGet('to_date');
                
            }
            else
            {
                $from_date =date('Y-m-d');
                $to_date=date('Y-m-d');
                
            }
            
            $this->data['from_date'] = $from_date;
            $this->data['to_date'] = $to_date;
       
        $this->data['teams_list'] = $this->teams_model->get_team_with_member_count();
        $this->data['total_members'] = $this->users_model->get(['role_id !=' => 1])->getNumRows();
        $this->data['teams'] = array_column($this->data['teams_list'], 'title', 'id');
        $this->data['team_members'] = $this->users_model->get_array_column([], 'id', 'team_id');
        
        $this->data['early_data'] = $this->reports_all_model->get_earlyleft_list($team_id,$from_date,$to_date);
        
        $this->data['team_id'] = $team_id;
        $this->data['page_title'] = 'Early Report';
        $this->data['page_name'] = 'Reports/early_report';
        return view('App/index', $this->data);
    }
    
    public function absent_report($team_id = null){
        
        if($this->request->getGet()) {
            if($this->request->getGet('date') > 0){
                $date = $this->request->getGet('date');
                $this->data['date'] = $date;
            } 
        }
        else
        {
            $this->data['date'] =$date = date('Y-m-d');
        }
       
        
        
        $logger = service('logger');
        $this->data['teams_list'] = $this->teams_model->get_team_with_member_count();
        $this->data['total_members'] = $this->users_model->get(['role_id !=' => 1])->getNumRows();
        $this->data['teams'] = array_column($this->data['teams_list'], 'title', 'id');
        $this->data['team_members'] = $this->users_model->get_array_column([], 'id', 'team_id');
        
        $this->data['absent_data'] = $this->reports_all_model->get_absent_list($team_id,$date);
        
        $this->data['team_id'] = $team_id;
        $this->data['page_title'] = 'Absent Report';
        $this->data['page_name'] = 'Reports/absent_report';
        return view('App/index', $this->data);
    }
    
    public function idle_report($team_id = null){
        
         
           
        if (!empty($this->request->getGet('from_date')) && !empty($this->request->getGet('to_date')))
            {
                $from_date = $this->request->getGet('from_date');
                $to_date = $this->request->getGet('to_date');
                
            }
            else
            {
                $from_date =date('Y-m-d');
                $to_date=date('Y-m-d');
                
            }
            
            $this->data['from_date'] = $from_date;
            $this->data['to_date'] = $to_date;
            
            
        $logger = service('logger');
        $this->data['teams_list'] = $this->teams_model->get_team_with_member_count();
        $this->data['total_members'] = $this->users_model->get(['role_id !=' => 1])->getNumRows();
        $this->data['teams'] = array_column($this->data['teams_list'], 'title', 'id');
        $this->data['team_members'] = $this->users_model->get_array_column([], 'id', 'team_id');
        
        
         $this->data['idle_data'] = $this->reports_all_model->get_idle_list($team_id,$from_date,$to_date);
        
        $this->data['team_id'] = $team_id;
        $this->data['page_title'] = 'Idle Report';
        $this->data['page_name'] = 'Reports/idle_report';
        return view('App/index', $this->data);
    }
      
    
    
    //THERESA
    public function attendance_report($month=NULL, $team_id=NULL){
        ini_set('memory_limit', '512M');
        ini_set('max_execution_time', '300');
        $logger = service('logger');
        $this->data['team_list'] = $this->teams_model->get_team_with_member_count();
        $this->data['total_members'] = $this->users_model->get(['role_id !=' => 1])->getNumRows();
        
        
        $monthyear = !empty($month) ? $month : date('Y-m');
        $team      = !empty($team_id) ? $team_id : '';
        $this->data['report'] = $this->reports_model->get_monthly_attendance_report($monthyear,$team);
        $logger->error('Database Error: ' , $this->data['report']);
        $this->data['month']   = $monthyear;
        $this->data['team_id'] = $team;
        $this->data['page_title'] = 'Attendance Report';
        $this->data['page_name'] = 'Reports/attendance_report';
        return view('App/index', $this->data);
   } 
    
    
    
    
    
    
    
    
    
    
    
}
