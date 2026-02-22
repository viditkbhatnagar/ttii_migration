<?php

namespace App\Controllers\App;
use Google;

use App\Models\Users_model;
use App\Entities\User;
use App\Models\User_role_model;


class Home extends AppBaseController
{
    private $users_model;
    private $user;
        private $user_role_model;


    public function __construct()
    {
        $this->users_model = new Users_model();
        $this->user = new User();
        $this->user_role_model = new User_role_model();


    }
    
    public function login_success()
    {
       
        $this->googleClient = new Google\Client();
        $this->googleClient->setClientId(get_settings('google_client_id'));
        $this->googleClient->setClientSecret(get_settings('google_client_secret'));
        $this->googleClient->setRedirectUri(base_url('app/home/login_success'));

        $code = $this->request->getGet('code');
        $token = $this->googleClient->fetchAccessTokenWithAuthCode($code);
    
        if (!isset($token['error'])) 
        {
            
            // Token acquired successfully, fetch user data
            $googleUser = $this->googleClient->verifyIdToken();
            
            // echo "<pre>";
            // print_r($googleUser); exit();
            
            $user = $this->users_model->get(['email' => $googleUser['email']])->getRow();
            
            if(!empty($user))
            {
                    $user_role = $this->user_role_model->get(['id' => $user->role_id])->getRow()->name ?? '';
                    //set session
                    $session = session();
                    $session->set([
                        'user_id' => $user->id,
                        'role_id' => $user->role_id,
                        'role_title' => $user_role,
                        'user_name' => $user->name,
                        'user_profile' => $user->profile_picture,
                        'user_email' => $user->email,
                        'is_logged_in' => true,
                        'logged_in_at' => time(),
                        'site_title' => get_site_title(),
                        'site_logo' => get_site_logo(),
                    ]);
                    $session->setFlashdata('message_success', "Welcome back! <b>{$user->name}</b>");
                    
                   return redirect()->to(base_url('app/desk_time/index'));
            }
            else
            {
                
                list($user, $domain) = explode('@', $googleUser['email']);

                if ($domain == 'gmail.com') 
                {
                        $data = [
                            'name' => $googleUser['name'],
                            'email' => $googleUser['email'],
                            // 'employee_code' => $this->request->getPost('employee_code'),
                            // 'phone' => $phone,
                            'role_id' => 2,
                            'jod' => date('Y-m-d'),
                            'password'  => $this->users_model->password_hash(rand(1000,9999)),
                            // 'user_designation_id' => $this->request->getPost('user_designation_id'),
                            // 'working_from' =>$this->request->getPost('working_from'),
                            'created_by' => get_user_id(),
                            'created_at' => date('Y-m-d H:i:s'),
                    ];
                    
                    
                   
                    $employee_id = $this->users_model->add($data);
                    
                    if($employee_id)
                    {
                        $user = $this->users_model->get(['email' => $googleUser['email']])->getRow();
                         $user_role = $this->user_role_model->get(['id' => $user->role_id])->getRow()->name ?? '';
                        
                        $session = session();
                            $session->set([
                                'user_id' => $user->id,
                                'role_id' => $user->role_id,
                                'role_title' => $user_role,
                                'user_name' => $user->name,
                                'user_profile' => $user->profile_picture,
                                'user_email' => $user->email,
                                'is_logged_in' => true,
                                'logged_in_at' => time(),
                                'site_title' => get_site_title(),
                                'site_logo' => get_site_logo(),
                            ]);
                            $session->setFlashdata('message_success', "Welcome {$user->name} ..... !");
                            
                           return redirect()->to(base_url('app/desk_time/index'));
                    }
                }
                
                
                else
                {
                     $session = session();
                    $session->setFlashdata('message_danger', "Sorry! User not found with email {$googleUser['email']}");
                    return redirect()->to(base_url('login/index'));
                }
            }
            
            
            
            
        } else {
            // Error handling
            echo "Error: " . $token['error'];
        }
    }
    
    
    
   
    
    
    
    
    
    
    
    
    
    
    
    
}
