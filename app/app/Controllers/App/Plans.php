<?php

namespace App\Controllers\App;
use App\Controllers\App\UserBaseController;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Package_model;
use App\Models\Subject_package_model;

class Plans extends UserBaseController
{
    private $course_model;
    private $users_model;
    private $package_model;
    private $subject_package_model;
    public function __construct()
    {
        parent::__construct();
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->package_model = new Package_model();
        $this->subject_package_model = new Subject_package_model();
    }

    public function index($course_id=0)
    {
        $this->data['course_details'] = $this->course_model->get(['id' => $course_id])->getRowArray();
        $userdata  = $this->users_model->get(['id' => $this->user_id])->getRow();
        $packages = $this->package_model->get(['course_id' => $course_id],[''])->getResultArray();
        
        $package_data = [];
        if(!empty($packages)){
            foreach($packages as $package)
            { 
                $details = $this->package_model->package_data($package,$userdata);
                
                if(!empty($details))
                {
                    $package_data['packages'][] = $details;
                }
                else
                {
                    $package_data['packages'] = [];
                }
            }
        }else{
            $package_data['packages'] = [];
        }
        
        $this->data['packages'] = $package_data;
        $this->data['course_id'] = $course_id;
        $this->data['page_title'] = 'Plans';
        $this->data['page_name'] = 'Plans/index';
        return view('App/index', $this->data);
    }
    


    public function plan_details($course_id = 0,$package_id = 0){
        
        $user  = $this->users_model->get(['id' => $this->user_id])->getRow();
        $userdata = $this->userdata($user);
        
        $this->data['course_details'] = $this->course_model->get(['id' => $course_id])->getRowArray();
        $package = $this->package_model->get(['id' => $package_id],[''])->getRowArray();
        
        $details = $this->package_model->package_data($package,$user);
        
        $this->data['subject_details'] = $details;
        $this->data['user_data'] = $userdata;
        
        $this->data['page_title'] = 'Plan Details';
        $this->data['page_name'] = 'Plans/plan_details';
        return view('App/index', $this->data);
    }

    private function userdata($user){
        $this->course_model = new Course_model();
        $course = $this->course_model->get(['id' => $user->course_id])->getRow();
        
        $userdata = [
            'user_id' => $user->id ?? '',
            'user_name' => $user->name ?? '',
            'user_email' => $user->user_email ?? '',
            'user_phone' => $user->phone ?? '',
            'role_id' => $user->role_id ?? '',
            'device_id' => $user->device_id ?? '',
            'status' => $user->status ?? 0,
            'course_id' => $user->course_id ?? '',
            'course_name' => $course->title ?? '',
            'user_image' => valid_file($user->image) ? base_url(get_file($user->image)) : '',
            'dob' => $user->dob ? date('d-m-Y', strtotime($user->dob)) : '',
            'privacy_policy' =>  base_url('home/privacy_policy')
        ];
        $userdata['auth_token'] = generate_auth_token($userdata);
        return $userdata;
    }


    public function generate_payment(){
        
        $package_id = $this->request->getGet('package_id');
        $package = $this->package_model->get(['id' => $package_id])->getRow();
        
        $userdata = $this->users_model->get(['id' => $this->user_id])->getRow();
        $email = $userdata->user_email ?? 'php.trogon@gmail.com';
        $subjects_id = $this->request->getGet('subjects');
        
        $currentDate = new \DateTime();
        $duration = $package->duration ?? 30 ;

        $currentDate->add(new \DateInterval('P' . $duration . 'D'));
        
        $expiry_date = $currentDate->format('Y-m-d');
        
        if(!is_array($subjects_id)) {
            $subjects = json_decode($subjects_id);
        }
        
        if(!empty($subjects)) {
            
            $subject_package = $this->subject_package_model->get(['package_id' => $package_id])->getResultArray();
            $total_amount = 0;
            if (!empty($subject_package)) {
                foreach ($subject_package as $subject) {
                    if (in_array($subject['id'], $subjects)) {
                        $total_amount += ($subject['amount'] - $subject['discount']);
                    }
                }
            }
            $amount = $total_amount;
        } else {
            $amount = $package->amount - $package->discount;
        }
         
        
        $data = 'https://project.trogon.info/easebuzz/index.php'
                . '?package_id=' . $package_id
                . '&package_name=' . urlencode($package->title)
                . '&user_id=' . $this->user_id
                . '&course_id=' . $package->course_id
                . '&name=' . urlencode($userdata->name)
                . '&phone=' . urlencode($userdata->phone)
                . '&email=' . urlencode($email)
                . '&amount=' . $amount
                . '&subjects=' . $subjects_id
                . '&platform=web'
                . '&expiry_date=' . $expiry_date;
        
        return redirect()->to($data, 301);
    }



     
    
    
}
