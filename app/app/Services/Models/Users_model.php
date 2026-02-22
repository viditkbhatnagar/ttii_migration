<?php namespace App\Models;

use CodeIgniter\Model;
use App\Services\Otp_service;
use App\Models\Course_model;

class Users_model extends Base_model
{
    protected $table         = 'users';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\User';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['name', 'email', 'phone', 'role_id', 'otp', 'password','user_designation_id'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'name' => 'required|min_length[5]',
        'email'    => 'required|valid_email|is_unique[users.email]',
        'password' => 'required|min_length[8]',
    ];

    protected $validationMessages = [
        'email' => [
            'is_unique' => 'This email address is already registered. Please use a different email.'
        ]
    ];

    // Optional: Define before insert/update methods to hash password
    protected $beforeInsert = ['password_hash_model'];
    protected $beforeUpdate = ['password_hash_model'];

    protected function password_hash_model(array $data)
    {
        if (isset($data['password'])) {
            $data['password'] = $this->password_hash($data['password']);
        }
        return $data;
    }


    // Login
    public function login($email, $password){
        $user_check = $this->get(['email' => $email]);
        if ($user_check->getNumRows() > 0){
            $user = $user_check->getRow();
            if (password_verify($password, $user->password)){
                $response = ['status' => true, 'message' => 'Login successful!', 'user' => $user];
            }else{
                $response = ['status' => false, 'message' => 'Invalid password!'];
            }
        }else{
            $response = ['status' => 0, 'message' => 'Email not found!'];
        }
        return $response;
    }

    // Login Google
    public function login_google($email, $account_id, $name){
        $user_check = $this->get(['email' => $email]);
        if ($user_check->getNumRows() > 0){
            $user = $user_check->getRow();
        }else{
            $insert_data = [
                'email' => $email,
                'account_id' => $account_id,
                'name' => $name,
                'role_id' => 2,
                'user_designation_id' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            $user_id = $this->add($insert_data);
            $user = $this->get(['id' => $user_id])->getRow();
        }
        $userdata = $this->userdata($user);
        $userdata['auth_token'] = generate_auth_token($userdata);
        $response = ['status' => true, 'message' => 'Login successful!', 'userdata' => $userdata];
        return $response;
    }

    // Login using phone
    public function login_phone($code, $phone){
        $phone_full = $code.$phone;
        $user_check = $this->get(['email' => $phone_full]);
        if ($user_check->getNumRows() > 0){
            $this->otp_service = new Otp_service();
            $otp = $this->otp_service->generate_otp($phone_full);
            $this->edit(['verification_code' => $otp], ['email' => $phone_full]);
            $this->otp_service->send_sms_otp($phone_full, $otp);

            $response = ['status' => true, 'message' => 'OTP Send Successfully!'];
        }else{
            $response = ['status' => false, 'message' => 'User not found!'];
        }
        return $response;
    }
    
    public function register_phone($code,$phone,$name){
        $phone_full = $code.$phone;
        $user_check = $this->get(['email' => $phone_full]);
        if ($user_check->getNumRows() == 0){
            $data['country_code'] = $code;
            $data['phone'] = $phone;
            $data['email'] = $phone_full;
            $data['name'] = $name;
            $data['role_id'] =2;
            $this->add($data);
            $this->otp_service = new Otp_service();
            $otp = $this->otp_service->generate_otp($phone_full);
            $this->otp_service->send_sms_otp($phone_full, $otp);
            $response = ['status' => true, 'message' => 'User Registered'];
        }else{
            $response = ['status' => false, 'message' => 'Phone number Already Existed!'];
        }
        return $response;
    }

    // verify otp
    public function verify_otp($user_id, $otp, $device_id){
        $user_check = $this->get(['id' => $user_id, 'verification_code' => $otp]);
        if ($user_check->getNumRows() > 0){
            $user_data = $this->userdata($user_check->getRow());
            //only send validity
            if($user_data['status'] == 0){ //if the user has not logged in
                //log as the user has logged in with device id
                $data['device_id'] = $device_id;
                $data['status'] = 1;
                $this->edit($data, ['id' => $user_data['user_id']]);
            }
            $response = ['status' => true, 'message' => 'OTP Verified Successfully!', 'userdata' => $user_data];
        }else{
            $response = ['status' => false, 'message' => 'Invalid OTP!', 'userdata' => []];
        }
        return $response;
    }

    // userdata
    public function userdata($user){
        $this->course_model = new Course_model();
        $course = $this->course_model->get(['id' => $user->course_id])->getRow();
        
        $userdata = [
            'user_id' => $user->id ?? '',
            'user_name' => $user->name ?? '',
            'user_email' => $user->user_email ?? '',
            'user_phone' => $user->email ?? '',
            'role_id' => $user->role_id ?? '',
            'device_id' => $user->device_id ?? '',
            'status' => $user->status ?? 0,
            'course_id' => $user->course_id ?? '',
            'course_name' => $course->title ?? '',
        ];
        $userdata['auth_token'] = generate_auth_token($userdata);
        return $userdata;
    }
    
    
    
    // NEWWW SECTION BELOW - ABID
    public function login_email($email,$password){
        $user_check = $this->get(['email' => $email]);
        if ($user_check->getNumRows() > 0){
            $user = $user_check->getRow();
            // log_message('error',print_r('abid'.$user,true));
            if (password_verify($password, $user->password)){
                $user_data = $this->userdata($user_check->getRow());
                
                $user_data['auth_token'] = generate_auth_token($user_data);
                $response = ['status' => true, 'message' => 'Login Successfully!', 'userdata' => $user_data];
            }else{
                $response = ['status' => false, 'message' => 'Invalid password!', 'userdata' => []];
            }
        }else{
            $response = ['status' => false, 'message' => 'E-mail not found!', 'userdata' => []];
        }
        return $response;
    }


    
    
    public function get_users_by_birthday_range($from_date='', $to_date='',$team_id='')
    {
        $query = $this->db->table('users')
                  ->select('users.name, users.dob, teams.title AS team_name,users.id AS user_id,user_designation.title AS user_designation_title,users.profile_picture')
                //   ->join('team_members', 'users.id = team_members.member_id')
                  ->join('teams', 'teams.id = users.team_id')
                  ->join('user_designation', 'user_designation.id = users.user_designation_id');

        if (!empty($from_date) && !empty($to_date)) {
            $from_month_day = date('m-d', strtotime($from_date));
            $to_month_day = date('m-d', strtotime($to_date));
            $query->where("DATE_FORMAT(users.dob, '%m-%d') BETWEEN '$from_month_day' AND '$to_month_day'");
        } else {
            // If no 'from' and 'to' dates are selected, filter out past anniversaries
            $current_month_day = date('m');
            // $query->where("DATE_FORMAT(users.dob, '%m-%d') >= '$current_month_day'");
            $query->where("DAYOFYEAR(users.dob) BETWEEN DAYOFYEAR(CURDATE()) AND DAYOFYEAR(DATE_ADD(CURDATE(), INTERVAL 7 DAY))"); 
        }
        
        if ($team_id > 0) {
            $query->where('users.team_id', $team_id);
        }
        
        // Order by team name in ascending order
        $query->orderBy('teams.title', 'ASC');
        
        $query = $query->get();
        
        // Fetch the result array
        $resultArray = $query->getResultArray();
        // log_message('error',print_r(get_last_query(),true));
        // Custom sorting function to sort by month and date of birth
        usort($resultArray, function($a, $b) {
            $dateA = date('m-d', strtotime($a['dob']));
            $dateB = date('m-d', strtotime($b['dob']));
            return strcmp($dateA, $dateB);
        });
        
        return $resultArray;

    }
    
    
    
    
    
    public function get_users_by_anniversary_range($from_date='', $to_date='',$team_id='')
    {
        $query = $this->db->table('users')
                  ->select('users.name, users.jod, teams.title AS team_name, users.id AS user_id, user_designation.title AS user_designation_title, users.profile_picture')
                //   ->join('team_members', 'users.id = team_members.member_id')
                  ->join('teams', 'teams.id = users.team_id')
                  ->join('user_designation', 'user_designation.id = users.user_designation_id');

        if (!empty($from_date) && !empty($to_date)) {
            $from_month_day = date('m-d', strtotime($from_date));
            $to_month_day = date('m-d', strtotime($to_date));
            $query->where("DATE_FORMAT(users.jod, '%m-%d') BETWEEN '$from_month_day' AND '$to_month_day'");
        } else {
            // If no 'from' and 'to' dates are selected, filter out past anniversaries
            $current_month_day = date('m-d');
            // $query->where("DATE_FORMAT(users.jod, '%m-%d') >= '$current_month_day'");
            $query->where("DAYOFYEAR(users.jod) BETWEEN DAYOFYEAR(CURDATE()) AND DAYOFYEAR(DATE_ADD(CURDATE(), INTERVAL 7 DAY))"); 
        }
        
        if ($team_id > 0) {
            $query->where('users.team_id', $team_id);
        }
        
        // Order by team name in ascending order
        $query->orderBy('teams.title', 'ASC');
        
        $query = $query->get();
        
        // Fetch the result array
        $resultArray = $query->getResultArray();
        
        // Custom sorting function to sort by month and date of joining
        usort($resultArray, function($a, $b) {
            $dateA = date('m-d', strtotime($a['jod']));
            $dateB = date('m-d', strtotime($b['jod']));
            return strcmp($dateA, $dateB);
        });
        
        return $resultArray;

    }
    
    
    
    
    
    
    public function get_birthday_details_by_user_id($user_id)
    {
        $query = $this->db->table('users')
                  ->select('users.name, users.dob, teams.title AS team_name,users.id AS user_id,user_designation.title AS user_designation_title,users.profile_picture')
                //   ->join('team_members', 'users.id = team_members.member_id')
                  ->join('teams', 'teams.id = users.team_id')
                  ->join('user_designation', 'user_designation.id = users.user_designation_id');

        $query->where('users.id', $user_id);
        $query = $query->get();
        return $query->getRowArray();
    }
    
    
    
    public function get_anniversary_details_by_user_id($user_id)
    {
        $query = $this->db->table('users')
                  ->select('users.name, users.dob, teams.title AS team_name,users.id AS user_id,user_designation.title AS user_designation_title,users.profile_picture')
                //   ->join('team_members', 'users.id = team_members.member_id')
                  ->join('teams', 'teams.id = users.team_id')
                  ->join('user_designation', 'user_designation.id = users.user_designation_id');

        $query->where('users.id', $user_id);
        $query = $query->get();
        return $query->getRowArray();
    }
    
    
     public function get_trashed($team_id = null)
    {
        $query = $this->db->table('users')
                ->select('*')
                // ->join('users', 'users.id = team_members.member_id', 'left')
                // ->where('users.role_id', 4)
                ->where('users.is_trashed', 1)
                ->orderBy('users.name', 'ASC');
        if(!empty($team_id))
        {
            $query->where('users.team_id', $team_id);
        }
        
        $results = $query->get()->getResultArray();
        return $results;
       
    }
    
    
    
    
    
    
    
    
    
    
    
    
    
    



}
