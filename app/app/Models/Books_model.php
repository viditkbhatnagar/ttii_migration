<?php namespace App\Models;

use CodeIgniter\Model;

class Books_model extends Base_model
{
    protected $table         = 'books';      // Database table name
    protected $primaryKey    = 'book_id';         // Primary key of the table
    protected $returnType    = 'App\Entities\books';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title','author','description','photo','status'];  // Fields that can be manipulated
    
    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
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
        $user_check = $this->get(['user_email' => $email]);
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
    // Login
    public function login_phone_password_for_web($code, $phone, $password){
       $phone_full = $code.$phone;
        $user_check = $this->get(['email' => $phone_full]);
        
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
    public function login_phone_password($code, $phone,$password,$device_id){
        $phone_full = $code.$phone;
        $user_check = $this->get(['email' => $phone_full]);
        if($phone !="")
        {
            if ($user_check->getNumRows() > 0)
            {
                $user = $user_check->getRow();

                if (password_verify($password, $user->password))
                {
                    if($user->status == 0)
                    { 

                        $data['device_id'] = $device_id;
                        $data['status'] = 1;
                        $this->edit($data, ['id' => $user->id]);
                    }
            
                    $user_data = $this->userdata($user_check->getRow());
                    $user_data['auth_token'] = generate_auth_token($user_data);
                    $response = ['status' => 1, 'message' => 'Login Successfully!', 'userdata' => $user_data];
                }
                else
                {
                    $response = ['status' => 0, 'message' => 'Invalid password!', 'userdata' => []];
                }
            }
            else
            {
                $response = ['status' => 0, 'message' => 'User not found!'];
            }
        }
        else
        {
            $response = ['status' => 0, 'message' => 'Phone number field is empty!'];
        }
        return $response;
    }
    
    
    
    
    
    

    // Login using phone
    public function login_phone($code, $phone){
        $phone_full = $code.$phone;
        $user_check = $this->get(['email' => $phone_full]);
        if($phone !=""){
            if ($user_check->getNumRows() > 0){
                $user_id = $this->get(['email' => $phone_full])->getRow()->id ?? '';
                $this->otp_service = new Otp_service();
                $otp = $this->otp_service->generate_otp($phone_full);
                $this->otp_service->send_sms_otp($phone_full, $otp);
                
                $updata['verification_code'] = $otp;
                $this->edit($updata, ['id' => $user_id]);
    
                $response = ['status' => 1, 'message' => 'OTP Send Successfully!','data'=>['user_id' => $user_id]];
            }else{
                $response = ['status' => 0, 'message' => 'User not found!'];
            }
        }else{
            $response = ['status' => 0, 'message' => 'Phone number field is empty!'];
        }
        return $response;
    }
    
    public function register_phone($code,$phone,$name,$password){
        $phone_full = $code.$phone;
        $user_check = $this->get(['email' => $phone_full]);
        if($phone !=""){
            if($user_check->getNumRows() == 0){
                if($name !=""){
                    $data['country_code'] = $code;
                    $data['phone'] = $phone;
                    $data['email'] = $phone_full;
                    $data['name'] = $name;
                    $data['password'] =  $this->password_hash($password);
                    $data['role_id'] =2;
                    $data['created_at'] = date('Y-m-d H:i:s');
                    $user_id = $this->add($data);
        
                    $this->otp_service = new Otp_service();
                    $otp = $this->otp_service->generate_otp($phone_full);
                    $this->otp_service->send_sms_otp($phone_full, $otp);
                    
                    $student_id = 'TT0000'.$user_id;
                    
                    
                    $updata['student_id'] = $student_id;
                    $updata['verification_code'] = $otp;
                    $this->edit($updata, ['id' => $user_id]);

                    $response = ['status' => 1, 'message' => 'User Registered','data'=>['user_id' => $user_id,'student_id' => $student_id]];
                }else{
                    $response = ['status' => 0, 'message' => 'Name field is empty!'];
                }
            }else{
                $response = ['status' => 0, 'message' => 'Phone number Already Exist!'];
            }
        }else{
            $response = ['status' => 0, 'message' => 'Phone number field is empty!'];
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
            $response = ['status' => 1, 'message' => 'OTP Verified Successfully!', 'userdata' => $user_data];
        }else{
            $response = ['status' => 0, 'message' => 'Invalid OTP!', 'userdata' => []];
        }
        return $response;
    }
    
    // Login
    public function verify_otp_login($user_id, $otp){
        $user_check = $this->get(['id' => $user_id, 'verification_code' => $otp]);
        
        if ($user_check->getNumRows() > 0){
            $user = $user_check->getRow();
            if ($user){
                $response = ['status' => true, 'message' => 'Login successful!', 'user' => $user];
            }else{
                $response = ['status' => false, 'message' => 'Invalid password!'];
            }
        }else{
            $response = ['status' => 0, 'message' => 'Email not found!'];
        }
        return $response;
    }
    
    
    

    // userdata
    public function userdata($user){
        $this->course_model = new Course_model();
        $this->notification_model = new Notification_model();

        $course = $this->course_model->get(['id' => $user->course_id])->getRow();
        
        $userdata = [
            'user_id' => $user->id ?? '',
            'student_id' => $user->student_id ?? '',
            'user_name' => $user->name ?? '',
            'role_id' => $user->role_id ?? '',
            'course_id'=> $user->course_id ?? ''
        ];
        $userdata['auth_token'] = generate_auth_token($userdata);
        $userdata['user_email'] = $user->user_email ?? '';
        $userdata['user_phone'] = $user->phone ?? '';
        $userdata['device_id'] = $user->device_id ?? '';
        $userdata['course_id'] = $user->course_id ?? '';
        $userdata['course_name'] = $course->title ?? '';
        $userdata['status']     = $user->status ?? 0;
        $userdata['academic_year']     = $user->academic_year ?? '';
        $userdata['user_image'] = valid_file($user->image) ? base_url(get_file($user->image)) : base_url('uploads/dummy.jpg');
        $userdata['dob']        = $user->dob ? date('d-m-Y', strtotime($user->dob)) : '';
        $userdata['privacy_policy'] = base_url('home/privacy_policy');
        

        
        
        
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
                $response = ['status' => 1, 'message' => 'Login Successfully!', 'userdata' => $user_data];
            }else{
                $response = ['status' => 0, 'message' => 'Invalid password!', 'userdata' => []];
            }
        }else{
            $response = ['status' => 0, 'message' => 'E-mail not found!', 'userdata' => []];
        }
        return $response;
    }

    
    
    
    
    
    
    
    
    



}
