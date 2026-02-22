<?php

namespace App\Controllers;
use Google;

use App\Models\Users_model;
use App\Models\Role_model;
use App\Entities\User;
use App\Models\Frontend_setting_model;

class Login extends PublicBaseController
{
    private $users_model;
    private $role_model;
    private $user;

    public function __construct()
    {
        parent::__construct();
        helper(['password_reset']);

        $this->users_model = new Users_model();
        $this->role_model = new Role_model();
        $this->user = new User();
        $this->frontend_setting_model = new Frontend_setting_model();
        
    }

   public function index()
    {
            if ($this->request->getMethod() === 'post') {
                $this->phone_login();
                
            }

        if (is_logged_in()) {
            if(is_student()){
                return redirect()->to(base_url('app/dashboard/index'));
            }else if(is_centre()){
                return redirect()->to(base_url('centre/dashboard/index'));
            }else{
                return redirect()->to(base_url('admin/dashboard/index'));
            }
        }

        return  redirect()->to(base_url('Login/admin_login'));
                

        
      
        // return view('Frontend/Login/student_login', $this->data);
    }
    
    
    public function admin_login(){
        if ($this->request->getMethod() === 'post') {
            $this->_action_login();
        }
        if (is_logged_in()) {
           
            if(is_admin()){
                return redirect()->to(base_url('admin/dashboard/index'));
            }elseif(is_subadmin()){
                return redirect()->to(base_url('admin/dashboard/index'));
            }
            else if(is_centre()){
                
                return redirect()->to(base_url('centre/dashboard/index'));
            } else if(is_instructor()){
                return redirect()->to(base_url('admin/dashboard/index'));
            } else if(is_counsellor()){
                return redirect()->to(base_url('admin/dashboard/index'));
            } else if(is_associate()){
                return redirect()->to(base_url('admin/dashboard/index'));
            }
            else{
                return redirect()->to(base_url('app/dashboard/index'));
            }
                
        }
        else
        {
                $this->data['google_button'] = '';

        }
        return view('Frontend/Login/index', $this->data);
    }

    public function instructor_login(){
        if ($this->request->getMethod() === 'post') {
            $this->_action_login();
        }
        if (is_logged_in()) {
            if(is_instructor()){
                return redirect()->to(base_url('admin/dashboard/index'));
            }else if(is_centre()){
                return redirect()->to(base_url('centre/dashboard/index'));
            }else{
                return redirect()->to(base_url('app/dashboard/index'));
            }
                
        }
        else
        {
                $this->data['google_button'] = '';

        }
        return view('Frontend/Login/index', $this->data);
    }

    private function phone_login()
    {
        // log_message('error', 'POST data: ' . print_r($this->request->getPost(), true));

        $phone = $this->request->getPost('phone');
        $code = $this->request->getPost('country_code');
        $password = $this->request->getPost('password');
        $login = $this->users_model->login_phone_password_for_web($code,$phone, $password);
        $site_logo = $this->frontend_setting_model->get(['key' => 'light_logo'])->getRow()->value;
        
        // print_r("ccdd"); exit();

        if ($login['status'] == 1){
            $user = $login['user'];
            
            $user_role = $this->role_model->get(['id' => $user->role_id])->getRow()->name ?? '';
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
                'site_logo' => $site_logo,
            ]);
            $session->setFlashdata('message_success', "Welcome back! <b>{$user->name}</b>");
        }else{
            $this->data['error'] = $login['message'];
        }
    }
    private function _action_login()
    {
        $email = $this->request->getPost('email');
        $password = $this->request->getPost('password');
        $role_id = $this->request->getPost('role_id');
        $login = $this->users_model->login($email, $password, $role_id);
        $site_logo = $this->frontend_setting_model->get(['key' => 'light_logo'])->getRow()->value;
        
        // print_r("ccdd"); exit();

        if ($login['status'] == 1){
            $user = $login['user'];
            
            $user_role = $this->role_model->get(['id' => $user->role_id])->getRow()->name ?? '';
            //set session
            $session = session();
            $session->set([
                'user_id' => $user->id,
                'role_id' => $user->role_id,
                'role_title' => $user_role,
                'user_name' => $user->name,
                // 'user_profile' => $user->profile_picture,
                'user_email' => $user->email,
                'is_logged_in' => true,
                'logged_in_at' => time(),
                'site_title' => get_site_title(),
                'site_logo' => $site_logo,
            ]);
            $session->setFlashdata('message_success', "Welcome back! <b>{$user->name}</b>");
        }else{
            $this->data['error'] = $login['message'];
        }
    }

    // Logout the session
    public function logout() 
    {
       $session                     = session();  
       $log_out                     = $this->request->getGet('logout');
       $session_out                 = false;
       $log_out_link                = base_url('login/index');
       $ret_value['log_out_link']   = $log_out_link;
       if($log_out == "1"){
           
         $session_out           = true;  
         $ret_value['leave']    = "leave";
         
       }else{
           
          
           $role_id = $session->get('role_id');
           
               $session_out              = true;
               $ret_value['hide_alert']  = "hide_alert"; 
            
           
           
           
       }
       
       
       if($session_out){
        //   log_message('error','session_outed: '.print_r("session_outed",true));
            session()->remove([
                'user_id',
                'role_id',
                'role_title',
                'name',
                'email',
                'is_logged_in',
                'logged_in_at',
                'site_title',
                'site_logo',
            ]);
           
           
       }
       
       $data = json_encode($ret_value);
       log_message('error','$data: '.print_r($data,true));
       echo $data;
        return redirect()->to(base_url('login/index'));
    }

    public function forgot_password(){
        if ($this->request->getMethod() === 'post') {
            // Admin reset by email
            if($this->request->getPost('email')){

                $email = $this->request->getPost('email');
                 // Try to find user by email (for admin)
                $user = $this->users_model->get(['email' => $email])->getRow();

                // If not found, try user_email (for students/others)
                if (!$user) {
                    $user = $this->users_model->get(['user_email' => $email])->getRow();
                }
                if (!$user) {
                    $this->data['error'] = 'No user found with this email.';
                    return view('Frontend/Login/forgot_password', $this->data);
                }
                if ($user->role_id == 1) {
                    if($this->send_reset_password_mail_admin($email)){
                        session()->setFlashdata('message_success', 'Reset password link sent to your email');
                        $this->data['success'] = 'Reset password link sent to your email';
                    } else {
                        $this->data['error'] = 'Failed to send reset link. Please try again.';
                    }
                } elseif ($user->role_id == 2) {
                    if($this->send_reset_password_mail_student($email)){
                        session()->setFlashdata('message_success', 'Reset password link sent to your email');
                        $this->data['success'] = 'Reset password link sent to your email';
                    } else {
                        $this->data['error'] = 'Failed to send reset link. Please try again.';
                    }
                }
                return view('Frontend/Login/forgot_password', $this->data);
            }
            // Student reset by phone
            // elseif($this->request->getPost('country_code') && $this->request->getPost('phone')){
            //     $phone = $this->request->getPost('country_code') . $this->request->getPost('phone');
            //     $user = $this->users_model->get(['email' => $phone])->getRow();
            //     if (!$user) {
            //         $this->data['error'] = 'No user found with this phone number.';
            //         return view('Frontend/Login/forgot_password', $this->data);
            //     }
            //     if ($user->role_id == 2) {
            //         if($this->send_reset_password_mail_student($phone)){
            //             $this->data['success'] = 'Reset password OTP sent to your registered email ID';
            //         } else {
            //             $this->data['error'] = 'Failed to send OTP. Please try again.';
            //         }
            //     } else {
            //         $this->data['error'] = 'Please use your email to reset your password.';
            //     }
            //     return view('Frontend/Login/forgot_password', $this->data);
            // }
            // Neither provided
            else {
                $this->data['error'] = 'Please enter your email';
                return view('Frontend/Login/forgot_password', $this->data);
            }
        }
        return view('Frontend/Login/forgot_password', $this->data);
    }


    private function send_reset_password_mail_admin($email){
        // Fetch user by email
        $user = $this->users_model->get(['email' => $email])->getRowArray();
        if (!$user) {
            // Optionally handle user not found
            log_message('error', 'Password reset requested for non-existent email: ' . $email);
            return false;
        }
        $adminName = $user['name'];
        try {
            $token = generate_password_reset_token(
                (int) $user['id'],
                (string) ($user['email'] ?? ''),
                (string) ($user['password'] ?? '')
            );
        } catch (\Throwable $e) {
            log_message('error', 'Password reset token generation failed: ' . $e->getMessage());
            return false;
        }
        $resetLink = base_url('login/reset_password/' . $user['id'] . '?token=' . urlencode($token));

        $subject = 'Password Reset Request for Your Admin Account - TTII';
        $bodyContent = <<<EOD
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <title>Password Reset Request – Teachers' Training Institute of India</title>
                        </head>
                        <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height:1.6; color:#2d3748; background-color:#f7fafc; margin:0; padding:0;">
                            <div style="max-width:650px; margin:20px auto; background:#fff; overflow:hidden;">
                                <div style="height:5px; background:linear-gradient(to right,#8B5CF6,#0a875c,#8B5CF6);"></div>
                                
                                <div style="padding:60px 40px 40px; background:#fff;">
                                    <div style="background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:30px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
                                        <p>Dear {$adminName},</p>
                                        <br>
                                        <p>We received a request to reset the password for your admin account on the <strong>Teachers' Training Institute of India Learning Management System</strong>.</p>
                                        <br>
                                        <p>To reset your password, please click the button below. This link is valid for a limited time only.</p>
                                        
                                        <div style="background:#f8faf9; padding:20px; border-radius:12px; margin:20px 0; border-left:4px solid #8B5CF6;">
                                            <h3 style="font-size:18px; font-weight:600; color:#2d3748; margin-bottom:15px;">Password Reset Link:</h3>
                                            <div style="text-align:center; margin-top:15px;">
                                                <a href="{$resetLink}" style="display:inline-block; background:#8B5CF6; color:#fff; padding:12px 30px; text-decoration:none; border-radius:8px; font-weight:600; margin:10px 0;">Reset Password</a>
                                            </div>
                                        </div>

                                        <p>If you did not request this password reset, please ignore this email or contact our support team at 
                                            <a href="mailto:support@teachersindia.in" style="color:#8B5CF6;">support@teachersindia.in</a>.
                                        </p>
                                        <br>
                                        <p>Thank you,<br><strong>Teachers' Training Institute of India</strong></p>
                                    </div>
                                </div>

                                <div style="background:#f8faf9; padding:30px; text-align:center; border-top:1px solid #e2e8f0;">
                                    <p style="color:#718096; font-size:14px; margin:5px 0;">Best regards,<br><strong>Teachers' Training Institute of India</strong></p>
                                    <div style="width:60px; height:2px; background:rgba(139,92,246,0.2); margin:15px auto;"></div>
                                    <p style="color:#718096; font-size:14px; margin:5px 0;">© 2025 Teachers' Training Institute of India</p>
                                    <p style="color:#718096; font-size:14px; margin:5px 0;">This email was sent to {$email}</p>
                                </div>
                            </div>
                        </body>
                        </html>
                        EOD;

        send_email_message($email, $adminName, $subject, $bodyContent, 'TTII Education');
        return true;
    }

    // ... existing code ...
    private function send_reset_password_mail_student($email){
        // Fetch user by email
        $user = $this->users_model->get(['user_email' => $email])->getRowArray();
        if (!$user) {
            // Optionally handle user not found
            log_message('error', 'Password reset requested for non-existent email: ' . $email);
            return false;
        }
        $user_email = $user['user_email'];
        $studentName = $user['name'];
        try {
            $token = generate_password_reset_token(
                (int) $user['id'],
                (string) ($user['user_email'] ?? ''),
                (string) ($user['password'] ?? '')
            );
        } catch (\Throwable $e) {
            log_message('error', 'Password reset token generation failed: ' . $e->getMessage());
            return false;
        }
        $resetLink = base_url('login/reset_password/' . $user['id'] . '?token=' . urlencode($token));

        $subject = 'Password Reset Request for Your Student Account - TTII';
        $bodyContent = <<<EOD
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <title>Password Reset Request – Teachers' Training Institute of India</title>
                        </head>
                        <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height:1.6; color:#2d3748; background-color:#f7fafc; margin:0; padding:0;">
                            <div style="max-width:650px; margin:20px auto; background:#fff; overflow:hidden;">
                                <div style="height:5px; background:linear-gradient(to right,#8B5CF6,#0a875c,#8B5CF6);"></div>
                                
                                <div style="padding:60px 40px 40px; background:#fff;">
                                    <div style="background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:30px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
                                        <p>Dear {$studentName},</p>
                                        <br>
                                        <p>We received a request to reset the password for your student account on the <strong>Teachers' Training Institute of India Learning Management System</strong>.</p>
                                        <br>
                                        <p>To reset your password, please click the button below. This link is valid for a limited time only.</p>
                                        
                                        <div style="background:#f8faf9; padding:20px; border-radius:12px; margin:20px 0; border-left:4px solid #8B5CF6;">
                                            <h3 style="font-size:18px; font-weight:600; color:#2d3748; margin-bottom:15px;">Password Reset Link:</h3>
                                            <div style="text-align:center; margin-top:15px;">
                                                <a href="{$resetLink}" style="display:inline-block; background:#8B5CF6; color:#fff; padding:12px 30px; text-decoration:none; border-radius:8px; font-weight:600; margin:10px 0;">Reset Password</a>
                                            </div>
                                        </div>

                                        <p>If you did not request this password reset, please ignore this email or contact our support team at 
                                            <a href="mailto:support@teachersindia.in" style="color:#8B5CF6;">support@teachersindia.in</a>.
                                        </p>
                                        <br>
                                        <p>Thank you,<br><strong>Teachers' Training Institute of India</strong></p>
                                    </div>
                                </div>

                                <div style="background:#f8faf9; padding:30px; text-align:center; border-top:1px solid #e2e8f0;">
                                    <p style="color:#718096; font-size:14px; margin:5px 0;">Best regards,<br><strong>Teachers' Training Institute of India</strong></p>
                                    <div style="width:60px; height:2px; background:rgba(139,92,246,0.2); margin:15px auto;"></div>
                                    <p style="color:#718096; font-size:14px; margin:5px 0;">© 2025 Teachers' Training Institute of India</p>
                                    <p style="color:#718096; font-size:14px; margin:5px 0;">This email was sent to {$user_email}</p>
                                </div>
                            </div>
                        </body>
                        </html>
                        EOD;


        send_email_message($user_email, $studentName, $subject, $bodyContent, 'TTII Education');
        return true;
    }
 // ... existing code ...

    public function reset_password($user_id){
        $token = (string) $this->request->getGet('token');
        $user = $this->users_model->get(['id' => $user_id])->getRow();
        if (!$user) {
            session()->setFlashdata('message_danger', 'Invalid password reset link.');
            return redirect()->to(base_url('login/forgot_password'));
        }

        $userEmail = !empty($user->user_email) ? $user->user_email : ($user->email ?? '');
        $isTokenValid = is_valid_password_reset_token(
            $token,
            (int) $user->id,
            (string) $userEmail,
            (string) $user->password
        );

        if (!$isTokenValid) {
            session()->setFlashdata('message_danger', 'Password reset link is invalid or has expired.');
            return redirect()->to(base_url('login/forgot_password'));
        }

        $this->data['email'] = $userEmail;
        $this->data['reset_token'] = $token;
        $this->data['reset_user_id'] = (int) $user->id;
        return view('Frontend/Login/reset_password', $this->data);
    }

    public function update_password(){
        $email = (string) $this->request->getPost('email');
        $token = (string) $this->request->getPost('reset_token');
        $userId = (int) $this->request->getPost('user_id');
        $plainPassword = (string) $this->request->getPost('password');
        $confirmPassword = (string) $this->request->getPost('confirm_password');

        if ($plainPassword === '' || $plainPassword !== $confirmPassword) {
            session()->setFlashdata('message_danger', 'Password confirmation does not match.');
            return redirect()->to(base_url('login/forgot_password'));
        }

        $user = $this->users_model->get(['id' => $userId])->getRow();
        if (!$user) {
            session()->setFlashdata('message_danger', 'Unable to update password.');
            return redirect()->to(base_url('login/forgot_password'));
        }

        $userEmail = !empty($user->user_email) ? $user->user_email : ($user->email ?? '');
        if (!is_valid_password_reset_token($token, (int) $user->id, (string) $userEmail, (string) $user->password)) {
            session()->setFlashdata('message_danger', 'Password reset link is invalid or has expired.');
            return redirect()->to(base_url('login/forgot_password'));
        }

        if (password_reset_normalize_email($email) !== password_reset_normalize_email($userEmail)) {
            session()->setFlashdata('message_danger', 'Unable to update password.');
            return redirect()->to(base_url('login/forgot_password'));
        }

        $password = $this->users_model->password_hash($plainPassword);
        $isUpdated = $this->users_model->edit(['password' => $password], ['id' => (int) $user->id]);

        if ($isUpdated) {
            session()->setFlashdata('message_success', 'Password updated successfully');
            return redirect()->to(base_url('login/index'));
        }

        session()->setFlashdata('message_danger', 'Failed to update password');
        return redirect()->to(base_url('login/forgot_password'));
    }
    
}
